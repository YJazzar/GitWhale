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

// GetGitLogCommitInfo fetches basic commit information for a single commit using git log
// This is much faster than GetDetailedCommitInfo as it uses a single git log command
func GetGitLogCommitInfo(repoPath, commitHash string) (*GitLogCommitInfo, error) {
	logger.Log.Info("Fetching git log commit info for %s in %s", commitHash, repoPath)

	// Use git log with -n1 to get just this commit
	commitsToLoad := 1
	options := GitLogOptions{
		CommitsToLoad: &commitsToLoad,
		FromRef:       &commitHash,
	}

	commits := ReadGitLog(repoPath, options)
	if len(commits) == 0 {
		return nil, fmt.Errorf("commit %s not found in repository %s", commitHash, repoPath)
	}

	// Return the first (and only) commit
	return &commits[0], nil
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

type WorktreeInfo struct {
	Path   string `json:"path"`
	Branch string `json:"branch"`
	Hash   string `json:"hash"`
	Bare   bool   `json:"bare"`
}

func GetRecentBranches(repoPath string, limit int) []GitRef {
	logger.Log.Info("Getting recent branches for repo: %v (limit: %d)", repoPath, limit)

	// Get local branches with last commit date using for-each-ref
	cmd := exec.Command("git", "for-each-ref",
		"--format=%(refname:short)|%(objectname)|%(committerdate:unix)",
		"--sort=-committerdate",
		fmt.Sprintf("--count=%d", limit),
		"refs/heads/")
	cmd.Dir = repoPath
	output, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		logger.Log.Error("Failed to get recent branches: %v", err)
		return make([]GitRef, 0)
	}

	var recentBranches []GitRef
	for _, line := range strings.Split(strings.TrimSpace(output), "\n") {
		if line == "" {
			continue
		}

		parts := strings.Split(line, "|")
		if len(parts) != 3 {
			continue
		}

		recentBranches = append(recentBranches, GitRef{
			Name: parts[0],
			Hash: parts[1],
			Type: "localBranch",
		})
	}

	return recentBranches
}

func GetWorktrees(repoPath string) []WorktreeInfo {
	logger.Log.Info("Getting worktrees for repo: %v", repoPath)

	cmd := exec.Command("git", "worktree", "list", "--porcelain")
	cmd.Dir = repoPath
	output, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		// If worktree command fails, this might not be a git repo or worktrees not supported
		logger.Log.Debug("Failed to get worktrees (likely not a worktree repo): %v", err)
		return make([]WorktreeInfo, 0)
	}

	var worktrees []WorktreeInfo
	var current WorktreeInfo

	for _, line := range strings.Split(strings.TrimSpace(output), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			// Empty line indicates end of worktree entry
			if current.Path != "" {
				worktrees = append(worktrees, current)
				current = WorktreeInfo{}
			}
			continue
		}

		if strings.HasPrefix(line, "worktree ") {
			current.Path = strings.TrimPrefix(line, "worktree ")
		} else if strings.HasPrefix(line, "HEAD ") {
			current.Hash = strings.TrimPrefix(line, "HEAD ")
		} else if strings.HasPrefix(line, "branch ") {
			current.Branch = strings.TrimPrefix(line, "branch refs/heads/")
		} else if line == "bare" {
			current.Bare = true
		}
	}

	// Add the last worktree if it exists
	if current.Path != "" {
		worktrees = append(worktrees, current)
	}

	return worktrees
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

// ValidateGitRef checks if a Git reference (branch, tag, commit hash, etc.) exists and is valid
func ValidateGitRef(repoPath, ref string) bool {
	logger.Log.Info(fmt.Sprintf("ValidateGitRef: Starting validation for ref '%s' in repo '%s'", ref, repoPath))

	if strings.TrimSpace(ref) == "" {
		logger.Log.Debug("ValidateGitRef: Empty ref provided, returning false")
		return false
	}

	// Use git rev-parse --verify which is very fast and handles all ref types
	// This works for: commit hashes, branch names, tag names, HEAD~1, etc.
	logger.Log.Debug(fmt.Sprintf("ValidateGitRef: Running 'git rev-parse --verify --quiet %s' in repo '%s'", ref, repoPath))
	cmd := exec.Command("git", "rev-parse", "--verify", "--quiet", ref)
	cmd.Dir = repoPath
	_, err := command_utils.RunCommandAndLogErr(cmd)

	isValid := err == nil

	// If the command succeeds (exit code 0), the ref is valid
	return isValid
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
