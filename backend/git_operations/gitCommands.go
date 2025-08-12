package git_operations

import (
	"fmt"
	"gitwhale/backend/command_utils"
	"gitwhale/backend/logger"
	"os/exec"
	"strconv"
	"strings"
)

type GitRef struct {
	Name string `json:"name"`
	Type string `json:"type"` // "localBranch", "remoteBranch", "tag"
	Hash string `json:"hash"`
}

type GitLogOptions struct {
	CommitsToLoad *int    `json:"commitsToLoad"`
	FromRef       *string `json:"fromRef"`
	SearchQuery   *string `json:"searchQuery"`
}

// Represents a line in `git log`'s output
type GitLogCommitInfo struct {
	CommitHash         string   `json:"commitHash"`
	Username           string   `json:"username"`
	UserEmail          string   `json:"userEmail"`
	CommitTimeStamp    string   `json:"commitTimeStamp"`
	AuthoredTimeStamp  string   `json:"authoredTimeStamp"`
	ParentCommitHashes []string `json:"parentCommitHashes"`
	Refs               string   `json:"refs"`
	CommitMessage      []string `json:"commitMessage"`
	ShortStat          string   `json:"shortStat"`
}

func GetCurrentBranchName(repoPath string) string {
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

func ReadGitLog(repoPath string, options GitLogOptions) []GitLogCommitInfo {
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

	// Add search query if provided
	if options.SearchQuery != nil && *options.SearchQuery != "" {
		args = append(args, "--grep="+(*options.SearchQuery), "--all-match", "--regexp-ignore-case")
	}

	if options.FromRef == nil || *options.FromRef == "" {
		head := "HEAD"
		options.FromRef = &head
	}
	args = append(args, *options.FromRef)

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

func GetAllRefs(repoPath string) []GitRef {
	logger.Log.Info("Getting branches for repo: %v", repoPath)

	parsedRefs := []GitRef{}

	// Get local branches
	cmd := exec.Command("git", "show-ref")
	cmd.Dir = repoPath
	commandOutput, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		return make([]GitRef, 0)
	}

	for _, line := range strings.Split(commandOutput, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		lineSubComponents := strings.Split(line, " ")
		if len(lineSubComponents) != 2 {
			logger.Log.Error("Tried to load refs for repo, but couldn't parse the line: '%v'", line)
		}
		refHash := lineSubComponents[0]
		fullRefName := lineSubComponents[1]

		// Figure out the type of ref this might be
		refType := ""
		shortRefName := ""
		if strings.HasPrefix(fullRefName, "refs/heads/") {
			refType = "localBranch"
			shortRefName = strings.TrimPrefix(fullRefName, "refs/heads/")
		} else if strings.HasPrefix(fullRefName, "refs/tags/") {
			refType = "tag"
			shortRefName = strings.TrimPrefix(fullRefName, "refs/tags/")
		} else if strings.HasPrefix(fullRefName, "refs/remotes/") {
			refType = "remoteBranch"
			shortRefName = strings.TrimPrefix(fullRefName, "refs/remotes/")
		}

		if refType == "" || shortRefName == "" {
			continue
		}

		parsedRefs = append(parsedRefs, GitRef{
			Name: shortRefName,
			Hash: refHash,
			Type: refType,
		})

	}

	return parsedRefs
}

func GitFetch(repoPath string) error {
	logger.Log.Info("Fetching for repo: %v", repoPath)

	cmd := exec.Command("git", "fetch", "origin")
	cmd.Dir = repoPath
	output, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		logger.Log.Error("Error fetching: %v, output: %s", err, string(output))
		return fmt.Errorf("failed to fetch: %v", err)
	}

	logger.Log.Info("Successfully fetched for repo: %v", repoPath)
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
	FilesChanged  int `json:"filesChanged"`
	LinesAdded    int `json:"linesAdded"`
	LinesDeleted  int `json:"linesDeleted"`
	LinesModified int `json:"linesModified"`
	TotalLines    int `json:"totalLines"`
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

	// Info used by the commit-pager view
	ChildHashes []string `json:"childHashes"`

	// Enhanced detailed info (only what's used in UI)
	ChangedFiles   []FileChange `json:"changedFiles"`
	CommitStats    CommitStats  `json:"commitStats"`
	CommitterName  string       `json:"committerName"`
	CommitterEmail string       `json:"committerEmail"`
}

// GetDetailedCommitInfo fetches comprehensive information about a specific commit
func GetDetailedCommitInfo(repoPath string, commitHash string) (*DetailedCommitInfo, error) {
	logger.Log.Info("Fetching detailed commit info for %s in %s", commitHash, repoPath)

	commit := &DetailedCommitInfo{}

	// Step 1: Get basic commit information
	if err := getBasicCommitInfo(repoPath, commitHash, commit); err != nil {
		return nil, err
	}

	// Step 2: Get file changes using git diff-tree
	if err := getCommitFileChanges(repoPath, commitHash, commit); err != nil {
		return nil, err
	}

	// Step 3: Get next and previous commit hashes for navigation
	if err := getCommitNavigation(repoPath, commitHash, commit); err != nil {
		logger.Log.Error("Failed to get commit navigation for %s: %v", commitHash, err)
		// Continue without navigation info rather than failing
	}

	logger.Log.Info("Successfully fetched detailed info for commit %s", commitHash)
	return commit, nil
}

// getBasicCommitInfo fetches the core commit information using git show
func getBasicCommitInfo(repoPath, commitHash string, commit *DetailedCommitInfo) error {
	// Use git show with precise format to get basic commit info
	cmd := exec.Command("git", "show", "--no-patch", "--format=%H%n%an%n%ae%n%cn%n%ce%n%ct%n%at%n%P%n%D%n%s%n%B", commitHash)
	cmd.Dir = repoPath
	output, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil || output == "" {
		return fmt.Errorf("failed to get commit info for %s: %v", commitHash, err)
	}

	lines := strings.Split(output, "\n")
	if len(lines) < 10 {
		return fmt.Errorf("invalid commit format for %s", commitHash)
	}

	// Parse fixed-position fields
	commit.CommitHash = strings.TrimSpace(lines[0])        // %H
	commit.Username = strings.TrimSpace(lines[1])          // %an
	commit.UserEmail = strings.TrimSpace(lines[2])         // %ae
	commit.CommitterName = strings.TrimSpace(lines[3])     // %cn
	commit.CommitterEmail = strings.TrimSpace(lines[4])    // %ce
	commit.CommitTimeStamp = strings.TrimSpace(lines[5])   // %ct
	commit.AuthoredTimeStamp = strings.TrimSpace(lines[6]) // %at
	commit.ParentCommitHashes = strings.Fields(lines[7])   // %P
	commit.Refs = strings.TrimSpace(lines[8])              // %D

	// Parse commit message (subject + body) -- %s and %B
	messageLines := []string{}
	if len(lines) > 9 {
		// Remaining lines are the body (%b), including empty lines
		for i := 10; i < len(lines); i++ {
			messageLines = append(messageLines, lines[i])
		}

		// Remove trailing empty lines only
		for len(messageLines) > 0 && strings.TrimSpace(messageLines[len(messageLines)-1]) == "" {
			messageLines = messageLines[:len(messageLines)-1]
		}
	}
	commit.CommitMessage = messageLines

	return nil
}

// getCommitFileChanges uses git diff-tree to get accurate file change information
func getCommitFileChanges(repoPath, commitHash string, commit *DetailedCommitInfo) error {
	// For root commit, compare against empty tree
	parentRef := ""
	if len(commit.ParentCommitHashes) == 0 {
		// Root commit - compare against empty tree
		parentRef = "4b825dc642cb6eb9a060e54bf8d69288fbee4904" // SHA of empty tree
	} else {
		// Use first parent for merge commits
		parentRef = commit.ParentCommitHashes[0]
	}

	// Get file status changes using diff-tree with proper options
	cmd := exec.Command("git", "diff-tree", "-r", "--name-status", "-z", "--diff-filter=ADMR", "--find-renames=50%", parentRef, commitHash)
	cmd.Dir = repoPath
	output, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		return fmt.Errorf("failed to get file changes for %s: %v", commitHash, err)
	}

	// Parse null-separated output
	fileChanges, err := parseFileChanges(output)
	if err != nil {
		return fmt.Errorf("failed to parse file changes: %v", err)
	}

	// Get line count statistics and enrich file changes in one pass
	stats, err := getNumstatData(repoPath, parentRef, commitHash, fileChanges)
	if err != nil {
		logger.Log.Error("Failed to get numstat data for %s: %v", commitHash, err)
		// Continue with empty stats rather than failing
		stats = &CommitStats{}
	}

	commit.ChangedFiles = fileChanges
	commit.CommitStats = *stats

	// Get short stat summary
	shortStatCmd := exec.Command("git", "diff", "--shortstat", parentRef, commitHash)
	shortStatCmd.Dir = repoPath
	shortStatOutput, err := command_utils.RunCommandAndLogErr(shortStatCmd)
	if err == nil {
		commit.ShortStat = strings.TrimSpace(shortStatOutput)
	}

	return nil
}

// getCommitNavigation efficiently gets the next and previous commit hashes for navigation
func getCommitNavigation(repoPath, commitHash string, commit *DetailedCommitInfo) error {
	// Use a more direct approach: search all reachable commits for those that have our commit as a parent
	// This is more efficient than the original approach but still finds all children regardless of branches
	
	childHashes := []string{}
	
	// Method: Use git rev-list with --all --parents to get commits and their parents,
	// but limit the search scope to avoid loading too many commits in huge repos
	
	// First, try to get a reasonable subset of recent commits from all refs
	// This covers most use cases while avoiding the full repository scan
	recentCmd := exec.Command("git", "rev-list", "--all", "--parents", "--max-count=10000")
	recentCmd.Dir = repoPath
	recentOutput, err := command_utils.RunCommandAndLogErr(recentCmd)
	if err != nil {
		// If this fails, fall back to empty child hashes rather than crashing
		commit.ChildHashes = []string{}
		return nil
	}

	// Parse the output to find commits that have our target commit as a parent
	lines := strings.Split(strings.TrimSpace(recentOutput), "\n")
	seenChildren := make(map[string]bool) // Avoid duplicates

	for _, line := range lines {
		if line == "" {
			continue
		}

		// Each line format: "commit_hash parent1_hash parent2_hash ..."
		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue // No parents, skip
		}

		childCommitHash := parts[0]
		parents := parts[1:]

		// Check if our target commit is a parent of this commit
		for _, parent := range parents {
			if parent == commitHash && !seenChildren[childCommitHash] {
				childHashes = append(childHashes, childCommitHash)
				seenChildren[childCommitHash] = true
				break
			}
		}
	}

	// If we didn't find any children in the recent commits, and the repo might be large,
	// try a more targeted approach using git log with ancestry-path from all refs
	if len(childHashes) == 0 {
		// Get all refs and check for immediate descendants
		refsCmd := exec.Command("git", "for-each-ref", "--format=%(refname)")
		refsCmd.Dir = repoPath
		refsOutput, refsErr := command_utils.RunCommandAndLogErr(refsCmd)
		
		if refsErr == nil {
			refs := strings.Split(strings.TrimSpace(refsOutput), "\n")
			for _, ref := range refs {
				ref = strings.TrimSpace(ref)
				if ref == "" {
					continue
				}
				
				// Check for commits that descend from our target on this ref
				descendantCmd := exec.Command("git", "rev-list", "--ancestry-path", "--reverse", commitHash+".."+ref, "-n", "1")
				descendantCmd.Dir = repoPath
				descendantOutput, descendantErr := command_utils.RunCommandAndLogErr(descendantCmd)
				
				if descendantErr == nil && strings.TrimSpace(descendantOutput) != "" {
					candidateHash := strings.TrimSpace(descendantOutput)
					
					// Verify this commit actually has our target as a direct parent
					parentsCmd := exec.Command("git", "rev-list", "--parents", "-n", "1", candidateHash)
					parentsCmd.Dir = repoPath
					parentsOutput, parentsErr := command_utils.RunCommandAndLogErr(parentsCmd)
					
					if parentsErr == nil {
						parentsParts := strings.Fields(strings.TrimSpace(parentsOutput))
						if len(parentsParts) > 1 {
							for _, parent := range parentsParts[1:] {
								if parent == commitHash && !seenChildren[candidateHash] {
									childHashes = append(childHashes, candidateHash)
									seenChildren[candidateHash] = true
									break
								}
							}
						}
					}
				}
			}
		}
	}

	commit.ChildHashes = childHashes
	return nil
}

// parseFileChanges parses the null-separated output from git diff-tree --name-status -z
func parseFileChanges(output string) ([]FileChange, error) {
	if output == "" {
		return []FileChange{}, nil
	}

	// Split by null character, removing empty last element
	parts := strings.Split(strings.TrimSuffix(output, "\x00"), "\x00")
	fileChanges := []FileChange{}

	for i := 0; i < len(parts); i += 2 {
		if i+1 >= len(parts) {
			break
		}

		status := parts[i]
		paths := parts[i+1]

		fileChange := FileChange{
			Status: string(status[0]), // Get base status (R, C, M, A, D)
		}

		// Handle renames and copies which have "old\tnew" format
		if strings.Contains(paths, "\t") {
			pathParts := strings.Split(paths, "\t")
			if len(pathParts) == 2 {
				fileChange.OldPath = pathParts[0]
				fileChange.Path = pathParts[1]
			} else {
				fileChange.Path = paths
			}
		} else {
			fileChange.Path = paths
		}

		fileChanges = append(fileChanges, fileChange)
	}

	return fileChanges, nil
}

// getNumstatData runs git diff --numstat once and returns both aggregate stats and enriches file changes
func getNumstatData(repoPath, parentRef, commitHash string, fileChanges []FileChange) (*CommitStats, error) {
	cmd := exec.Command("git", "diff", "--numstat", parentRef, commitHash)
	cmd.Dir = repoPath
	output, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		return nil, err
	}

	stats := &CommitStats{}

	// Create a map for quick lookups by file path
	fileStatsMap := make(map[string]struct {
		linesAdded   int
		linesDeleted int
		isBinary     bool
	})

	lines := strings.Split(strings.TrimSpace(output), "\n")
	for _, line := range lines {
		if line == "" {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) < 3 {
			continue
		}

		additionsStr := parts[0]
		deletionsStr := parts[1]
		filepath := parts[2]

		var linesAdded, linesDeleted int
		var isBinary bool

		// Binary files are marked with "-" for both additions and deletions
		if additionsStr == "-" && deletionsStr == "-" {
			isBinary = true
		} else {
			if val, parseErr := strconv.Atoi(additionsStr); parseErr == nil {
				linesAdded = val
				stats.LinesAdded += linesAdded
			}
			if val, parseErr := strconv.Atoi(deletionsStr); parseErr == nil {
				linesDeleted = val
				stats.LinesDeleted += linesDeleted
			}
		}

		stats.FilesChanged++
		fileStatsMap[filepath] = struct {
			linesAdded   int
			linesDeleted int
			isBinary     bool
		}{linesAdded, linesDeleted, isBinary}
	}

	// Calculate aggregate totals
	stats.TotalLines = stats.LinesAdded + stats.LinesDeleted
	stats.LinesModified = stats.LinesAdded + stats.LinesDeleted

	// Enrich file changes with per-file statistics
	for i := range fileChanges {
		file := &fileChanges[i]

		// Try to find stats using the current path
		if statsData, found := fileStatsMap[file.Path]; found {
			file.LinesAdded = statsData.linesAdded
			file.LinesDeleted = statsData.linesDeleted
			file.BinaryFile = statsData.isBinary
		} else if file.OldPath != "" {
			// For renames, try the old path
			if statsData, found := fileStatsMap[file.OldPath]; found {
				file.LinesAdded = statsData.linesAdded
				file.LinesDeleted = statsData.linesDeleted
				file.BinaryFile = statsData.isBinary
			} else {
				// Default values if no match found
				file.LinesAdded = 0
				file.LinesDeleted = 0
				file.BinaryFile = false
			}
		} else {
			// Default values if no match found
			file.LinesAdded = 0
			file.LinesDeleted = 0
			file.BinaryFile = false
		}
	}

	return stats, nil
}
