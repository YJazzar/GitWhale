package backend

import (
	"fmt"
	"gitwhale/backend/command_utils"
	"gitwhale/backend/logger"
	"os/exec"
	"strconv"
	"strings"
)

type GitRef struct {
	Name   string `json:"name"`
	Type   string `json:"type"` // "local", "remote", "tag"
	Hash   string `json:"hash"`
	IsHead bool   `json:"isHead"`
}

type GitLogOptions struct {
	CommitsToLoad *int    `json:"commitsToLoad"`
	FromRef       *string `json:"fromRef"`
	ToRef         *string `json:"toRef"`
	SearchQuery   *string `json:"searchQuery"`
	Author        *string `json:"author"`
}

func getCurrentBranchName(repoPath string) string {
	cmd := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = repoPath
	branchName, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(branchName)
}

// parseGitLogOutput parses the output lines from git log command into GitLogCommitInfo structs
func parseGitLogOutput(outputLines []string) []GitLogCommitInfo {
	parsedLogs := []GitLogCommitInfo{}
	currentLog := GitLogCommitInfo{}
	currentSubLineCount := -1
	onShortStatLine := false

	for _, line := range outputLines {
		// logger.Log.Debug("Parsing line: %v", line)
		currentSubLineCount += 1

		// The null terminators comes right before the short-stat line
		// (because of the -z flag)
		if line == "\x00" {
			onShortStatLine = true
			continue
		}

		if onShortStatLine {
			currentLog.ShortStat = line
			currentSubLineCount = -1
			onShortStatLine = false
			parsedLogs = append(parsedLogs, currentLog)
			currentLog = GitLogCommitInfo{}
			continue
		}

		switch currentSubLineCount {
		case 0:
			currentLog.CommitHash = line
		case 1:
			currentLog.Username = line
		case 2:
			currentLog.UserEmail = line
		case 3:
			currentLog.AuthoredTimeStamp = line
		case 4:
			currentLog.CommitTimeStamp = line
		case 5:
			currentLog.ParentCommitHashes = strings.Split(line, " ")
		case 6:
			currentLog.Refs = line
		case 7:
			currentLog.CommitMessage = []string{line}
		default:
			currentLog.CommitMessage = append(currentLog.CommitMessage, line)
		}
	}

	return parsedLogs
}

func readGitLog(repoPath string, options GitLogOptions) []GitLogCommitInfo {
	logger.Log.Info("Running git log with options on repo: %v", repoPath)

	// Build git log command arguments safely
	args := []string{
		"log",
		"--format=%H%n%aN%n%aE%n%at%n%ct%n%P%n%D%n%B",
		"-z",
		"--shortstat",
		"--topo-order",
		"--decorate=full",
		"--diff-merges=first-parent",
		fmt.Sprintf("-n%d", *options.CommitsToLoad),
	}

	// Add search query if provided (safely escaped)
	if options.SearchQuery != nil && *options.SearchQuery != "" {
		args = append(args, "--grep="+(*options.SearchQuery), "--all-match")
	}

	// Add author filter if provided (safely escaped)
	if options.Author != nil && *options.Author != "" {
		args = append(args, "--author="+(*options.Author))
	}

	if options.FromRef == nil || *options.FromRef == "" {
		head := "HEAD"
		options.FromRef = &head
	}

	// Add commit range if provided
	if options.ToRef != nil && *options.ToRef != "" {
		args = append(args, (*options.FromRef)+".."+(*options.ToRef))
	} else {
		args = append(args, *options.FromRef)
	}

	cmd := exec.Command("git", args...)
	cmd.Dir = repoPath
	cmdOutput, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		return make([]GitLogCommitInfo, 0)
	}

	outputLines := strings.Split(cmdOutput, "\n")
	parsedLogs := parseGitLogOutput(outputLines)
	return parsedLogs
}

func getBranches(repoPath string) []GitRef {
	logger.Log.Info("Getting branches for repo: %v", repoPath)

	branches := []GitRef{}
	currentBranch := getCurrentBranchName(repoPath)

	// Get local branches
	cmd := exec.Command("git", "show-ref")

	// Sample output:
	// 0b5a873158a453932dfad013b9be088ae8eede9a refs/heads/development
	// a42e1b9e807d029c2e435e96ec3532ad236a7063 refs/heads/experimental/new-api
	// e2a1451040357c0f877808a9253f888627cb726f refs/heads/feature/authentication
	// d25d416ecd23ca922dfab9242120810299b90272 refs/heads/feature/backend
	// 7342b22ba5fd3588364d8ef1bb4edbb94adf83a8 refs/heads/feature/database
	// 4ecaac7af22368d929005458f69b1828dbc77c49 refs/heads/feature/frontend
	// 1a0690ab437f94c68d026ba47f068e6be3cd8d6e refs/heads/feature/mobile-support
	// 2990c4fd4977ece35b37537ae466a083e939d266 refs/heads/feature/refactoring
	// 14695022fd83c5375707c9fcbb0d7ef0104bc47e refs/heads/feature/user-management
	// 989e4c3275631909cba79db99164b50d9b12ccbb refs/heads/hotfix/security-patch
	// 110adeca9edd8df4b1ebde36f56b732932755624 refs/heads/main
	// 70243d57e0471d5e529735f31a51f59fb5382b31 refs/heads/release/v1.0
	// c2cd86a83345dc593bbdf026c6a0ad1260973db6 refs/heads/second_branch
	// b77b84a01e1a69ca44cfcacf4f264be21e5e6fd5 refs/tags/v0.1.0
	// 3c928d2ae052358c481f865d8874e36f711a852a refs/tags/v0.2.0-beta
	// bce16c3e2831056f7f9ebc05356c0e54c0311e5c refs/tags/v1.0.0-rc1
	// 01dd39b6548bfef5110e266e5109e8f7bec5381b refs/heads/commit_diff
	// 01dd39b6548bfef5110e266e5109e8f7bec5381b refs/heads/custom_state_mgmt
	// 495363cac93843bf49b71e5a880c37f11ad7b720 refs/heads/main
	// 2ee831347e0c6d6d0e9b6b64120002ca8aeb036f refs/remotes/origin/HEAD
	// 01dd39b6548bfef5110e266e5109e8f7bec5381b refs/remotes/origin/commit_diff
	// 01dd39b6548bfef5110e266e5109e8f7bec5381b refs/remotes/origin/custom_state_mgmt
	// 2ee831347e0c6d6d0e9b6b64120002ca8aeb036f refs/remotes/origin/main
	// dec6658ca8e9ab2f456fee3e53a31f860f79ef25 refs/stash

	cmd.Dir = repoPath
	localOutput, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		return make([]GitRef, 0)
	}

	for _, line := range strings.Split(localOutput, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Remove the * marker for current branch
		isHead := strings.HasPrefix(line, "*")
		if isHead {
			line = strings.TrimSpace(line[1:])
		}

		// Parse: "branch_name hash commit_message"
		parts := strings.Fields(line)
		if len(parts) >= 2 {
			branchName := parts[0]
			hash := parts[1]

			branches = append(branches, GitRef{
				Name:   branchName,
				Hash:   hash,
				Type:   "local",
				IsHead: branchName == currentBranch,
			})
		}
	}

	// Get remote branches
	cmd = exec.Command("git", "branch", "-rv")
	cmd.Dir = repoPath
	remoteOutput, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		return make([]GitRef, 0)
	}

	for _, line := range strings.Split(remoteOutput, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.Contains(line, "->") {
			continue
		}

		// Parse: "origin/branch_name hash commit_message"
		parts := strings.Fields(line)
		if len(parts) >= 2 {
			branchName := parts[0]
			hash := parts[1]

			branches = append(branches, GitRef{
				Name:   branchName,
				Hash:   hash,
				Type:   "remote",
				IsHead: false,
			})
		}
	}

	return branches
}

func getTags(repoPath string) []GitRef {
	logger.Log.Info("Getting tags for repo: %v", repoPath)

	tags := []GitRef{}

	// Get all tags with their hashes
	cmd := exec.Command("git", "tag", "-l")
	cmd.Dir = repoPath
	tagOutput, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		return make([]GitRef, 0)
	}

	for _, line := range strings.Split(tagOutput, "\n") {
		tagName := strings.TrimSpace(line)
		if tagName == "" {
			continue
		}

		// Get the hash for this tag (safely escaped)
		hashCmd := exec.Command("git", "rev-list", "-n", "1", tagName)
		hashCmd.Dir = repoPath
		hash, err := command_utils.RunCommandAndLogErr(hashCmd)
		if err != nil {
			return make([]GitRef, 0)
		}

		hash = strings.TrimSpace(hash)
		if hash != "" {
			tags = append(tags, GitRef{
				Name:   tagName,
				Hash:   hash,
				Type:   "tag",
				IsHead: false,
			})
		}
	}

	return tags
}

func gitFetch(repoPath, remote, ref string) error {
	logger.Log.Info("Fetching %s/%s for repo: %v", remote, ref, repoPath)

	var cmd *exec.Cmd
	if ref == "" {
		// Fetch all refs from remote
		cmd = exec.Command("git", "fetch", remote)
	} else {
		// Fetch specific ref from remote
		cmd = exec.Command("git", "fetch", remote, ref)
	}

	cmd.Dir = repoPath
	output, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		logger.Log.Error("Error fetching %s/%s: %v, output: %s", remote, ref, err, string(output))
		return fmt.Errorf("failed to fetch %s/%s: %v", remote, ref, err)
	}

	logger.Log.Info("Successfully fetched %s/%s", remote, ref)
	return nil
}

// Enhanced commit information structures
type FileChange struct {
	Path         string `json:"path"`
	OldPath      string `json:"oldPath"` // for renames
	Status       string `json:"status"`  // M, A, D, R, C, etc.
	LinesAdded   int    `json:"linesAdded"`
	LinesDeleted int    `json:"linesDeleted"`
	BinaryFile   bool   `json:"binaryFile"`
}

type CommitStats struct {
	FilesChanged int `json:"filesChanged"`
	LinesAdded   int `json:"linesAdded"`
	LinesDeleted int `json:"linesDeleted"`
	TotalLines   int `json:"totalLines"`
}

type DetailedCommitInfo struct {
	// Basic info (existing)
	CommitHash         string   `json:"commitHash"`
	Username           string   `json:"username"`
	UserEmail          string   `json:"userEmail"`
	CommitTimeStamp    string   `json:"commitTimeStamp"`
	AuthoredTimeStamp  string   `json:"authoredTimeStamp"`
	ParentCommitHashes []string `json:"parentCommitHashes"`
	Refs               string   `json:"refs"`
	CommitMessage      []string `json:"commitMessage"`
	ShortStat          string   `json:"shortStat"`

	// Enhanced detailed info
	FullDiff       string       `json:"fullDiff"`
	ChangedFiles   []FileChange `json:"changedFiles"`
	CommitStats    CommitStats  `json:"commitStats"`
	AuthorDate     string       `json:"authorDate"`
	CommitterName  string       `json:"committerName"`
	CommitterEmail string       `json:"committerEmail"`
	GPGSignature   string       `json:"gpgSignature"`
	TreeHash       string       `json:"treeHash"`
	CommitSize     int          `json:"commitSize"`
	Encoding       string       `json:"encoding"`
}

// GetDetailedCommitInfo fetches comprehensive information about a specific commit
func (a *App) GetDetailedCommitInfo(repoPath string, commitHash string) (*DetailedCommitInfo, error) {
	logger.Log.Info("Fetching detailed commit info for %s in %s", commitHash, repoPath)

	// Get comprehensive commit info using git show with proper formatting
	cmd := exec.Command("git", "show", "--pretty=format:%H%n%an%n%ae%n%cn%n%ce%n%ct%n%at%n%P%n%D%n%T%n%B", "--stat", "--numstat", "--name-status", commitHash)
	cmd.Dir = repoPath
	output, err := command_utils.RunCommandAndLogErr(cmd)

	if output == "" || err != nil {
		return nil, fmt.Errorf("commit %s not found", commitHash)
	}

	lines := strings.Split(output, "\n")
	if len(lines) < 10 {
		return nil, fmt.Errorf("invalid git show output for commit %s", commitHash)
	}

	// Parse the basic header info
	commit := &DetailedCommitInfo{
		CommitHash:         lines[0],                 // %H
		Username:           lines[1],                 // %an
		UserEmail:          lines[2],                 // %ae
		CommitterName:      lines[3],                 // %cn
		CommitterEmail:     lines[4],                 // %ce
		CommitTimeStamp:    lines[5],                 // %ct
		AuthoredTimeStamp:  lines[6],                 // %at
		ParentCommitHashes: strings.Fields(lines[7]), // %P
		Refs:               lines[8],                 // %D
		TreeHash:           lines[9],                 // %T
		AuthorDate:         lines[6],                 // same as authored timestamp
	}

	// Parse commit message (everything after line 10 until we hit stats)
	messageLines := []string{}
	messageStartIndex := 10
	statsStartIndex := -1

	// Find where the message ends and stats begin
	for i := messageStartIndex; i < len(lines); i++ {
		line := lines[i]

		// Check if we've hit the stat section
		if strings.Contains(line, "file") && (strings.Contains(line, "changed") || strings.Contains(line, "insertion") || strings.Contains(line, "deletion")) {
			statsStartIndex = i
			break
		}
		// Check if we've hit the numstat section (tab-separated)
		if strings.Contains(line, "\t") && len(strings.Split(line, "\t")) >= 3 {
			statsStartIndex = i
			break
		}
		// Check if we've hit the name-status section (single letter followed by tab)
		if len(line) > 1 && strings.Contains(line[1:2], "\t") {
			statsStartIndex = i
			break
		}

		// This is part of the commit message
		messageLines = append(messageLines, line)
	}

	// Clean up the message - remove empty lines from the end
	for len(messageLines) > 0 && strings.TrimSpace(messageLines[len(messageLines)-1]) == "" {
		messageLines = messageLines[:len(messageLines)-1]
	}
	commit.CommitMessage = messageLines

	// Parse file changes and statistics
	changedFiles := []FileChange{}
	fileStatusMap := make(map[string]string) // filename -> status
	stats := CommitStats{}

	if statsStartIndex >= 0 {
		for i := statsStartIndex; i < len(lines); i++ {
			line := strings.TrimSpace(lines[i])
			if line == "" {
				continue
			}

			// Parse name-status format: "M\tfilename" or "R100\told\tnew"
			if len(line) > 1 && strings.Contains(line, "\t") {
				parts := strings.Split(line, "\t")
				if len(parts) >= 2 {
					status := parts[0]
					filename := parts[1]

					// Handle renames/copies
					if len(parts) > 2 && (strings.HasPrefix(status, "R") || strings.HasPrefix(status, "C")) {
						filename = parts[2] // new filename for renames/copies
					}

					fileStatusMap[filename] = string(status[0]) // Get first character of status
				}
			}

			// Parse numstat format: "additions\tdeletions\tfilename"
			if strings.Count(line, "\t") >= 2 {
				parts := strings.Split(line, "\t")
				if len(parts) >= 3 {
					additionsStr := parts[0]
					deletionsStr := parts[1]
					filename := parts[2]

					var linesAdded, linesDeleted int
					var isBinary bool

					if additionsStr == "-" && deletionsStr == "-" {
						// Binary file
						isBinary = true
					} else {
						if val, err := strconv.Atoi(additionsStr); err == nil {
							linesAdded = val
						}
						if val, err := strconv.Atoi(deletionsStr); err == nil {
							linesDeleted = val
						}
					}

					// Get status from the map, default to Modified
					status := "M"
					if s, exists := fileStatusMap[filename]; exists {
						status = s
					}

					changedFiles = append(changedFiles, FileChange{
						Path:         filename,
						Status:       status,
						LinesAdded:   linesAdded,
						LinesDeleted: linesDeleted,
						BinaryFile:   isBinary,
					})

					stats.LinesAdded += linesAdded
					stats.LinesDeleted += linesDeleted
					stats.FilesChanged++
				}
			}

			// Parse shortstat format for summary
			if strings.Contains(line, "changed") || strings.Contains(line, "insertion") || strings.Contains(line, "deletion") {
				commit.ShortStat = line
			}
		}
	}

	commit.ChangedFiles = changedFiles
	commit.CommitStats = stats
	commit.CommitStats.TotalLines = stats.LinesAdded + stats.LinesDeleted

	// Get full diff
	diffCmd := exec.Command("git", "show", commitHash)
	diffCmd.Dir = repoPath
	diffOutput, err := command_utils.RunCommandAndLogErr(diffCmd)
	if err == nil {
		commit.FullDiff = diffOutput
	} else {
		commit.FullDiff = "Error getting diff"
	}

	// Get GPG signature verification
	gpgCmd := exec.Command("git", "verify-commit", commitHash)
	gpgCmd.Dir = repoPath
	gpgOutput, err := command_utils.RunCommandAndLogErr(gpgCmd)
	if err == nil {
		commit.GPGSignature = string(gpgOutput)
	} else {
		commit.GPGSignature = "Not signed or verification failed"
	}

	// Get commit object size
	sizeCmd := exec.Command("git", "cat-file", "-s", commitHash)
	sizeCmd.Dir = repoPath
	sizeOutput, err := command_utils.RunCommandAndLogErr(sizeCmd)
	if sizeOutput != "" && err == nil {
		fmt.Sscanf(strings.TrimSpace(sizeOutput), "%d", &commit.CommitSize)
	}

	// Get encoding info from commit object
	catCmd := exec.Command("git", "cat-file", "commit", commitHash)
	catCmd.Dir = repoPath
	catOutput, err := command_utils.RunCommandAndLogErr(catCmd)
	if strings.Contains(catOutput, "encoding ") && err == nil {
		for _, line := range strings.Split(catOutput, "\n") {
			if strings.HasPrefix(line, "encoding ") {
				commit.Encoding = strings.TrimPrefix(line, "encoding ")
				break
			}
		}
	}
	if commit.Encoding == "" && err == nil {
		commit.Encoding = "UTF-8" // Default encoding
	}
	if err != nil {
		commit.Encoding = "ERROR"
	}

	logger.Log.Info("Successfully fetched detailed info for commit %s", commitHash)
	return commit, nil
}
