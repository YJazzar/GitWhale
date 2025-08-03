package backend

import (
	"fmt"
	"os/exec"
	"strings"
)

type GitRef struct {
	Name   string `json:"name"`
	Type   string `json:"type"` // "local", "remote", "tag"
	Hash   string `json:"hash"`
	IsHead bool   `json:"isHead"`
}

type GitLogOptions struct {
	CommitsToLoad int    `json:"commitsToLoad"`
	FromRef       string `json:"fromRef"`
	ToRef         string `json:"toRef"`
	IncludeMerges bool   `json:"includeMerges"`
	SearchQuery   string `json:"searchQuery"`
	Author        string `json:"author"`
}

func getCurrentBranchName(repoPath string) string {
	cmd := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = repoPath
	return strings.TrimSpace(runCommandAndLogErr(cmd))
}

// parseGitLogOutput parses the output lines from git log command into GitLogCommitInfo structs
func parseGitLogOutput(outputLines []string) []GitLogCommitInfo {
	parsedLogs := []GitLogCommitInfo{}
	currentLog := GitLogCommitInfo{}
	currentSubLineCount := -1
	onShortStatLine := false
	
	for _, line := range outputLines {
		Log.Debug("Parsing line: %v", line)
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

func readGitLog(repoPath string, commitsToLoad int, fromRef string, includeMerges bool, searchQuery string) []GitLogCommitInfo {
	Log.Info("Running git log on repo: %v", repoPath)

	// Build git log command arguments safely
	args := []string{
		"log",
		"--format=%H%n%aN%n%aE%n%at%n%ct%n%P%n%D%n%B",
		"-z",
		"--shortstat",
		"--topo-order",
		"--decorate=full",
		fmt.Sprintf("-n%d", commitsToLoad),
	}
	
	// Add merge handling
	if includeMerges {
		args = append(args, "--diff-merges=first-parent")
	} else {
		args = append(args, "--no-merges")
	}
	
	// Add search query if provided (safely escaped)
	if searchQuery != "" {
		args = append(args, "--grep="+searchQuery, "--all-match")
	}
	
	// Add ref if provided, otherwise default to HEAD
	if fromRef != "" {
		args = append(args, fromRef)
	}

	cmd := exec.Command("git", args...)
	cmd.Dir = repoPath

	cmdOutput := runCommandAndLogErr(cmd)

	outputLines := strings.Split(cmdOutput, "\n")
	Log.Debug("Lines split up: %v", outputLines)

	parsedLogs := parseGitLogOutput(outputLines)
	Log.Info("Parsed logs: %v", PrettyPrint(parsedLogs))

	return parsedLogs
}

func runCommandAndLogErr(command *exec.Cmd) string {
	result, err := command.Output()
	if err != nil {
		Log.Error("Error running command: [%v] -> %v\n", command.Args, err)
	}

	return string(result)
}

func readGitLogWithOptions(repoPath string, options GitLogOptions) []GitLogCommitInfo {
	Log.Info("Running git log with options on repo: %v", repoPath)

	// Build git log command arguments safely
	args := []string{
		"log",
		"--format=%H%n%aN%n%aE%n%at%n%ct%n%P%n%D%n%B",
		"-z",
		"--shortstat",
		"--topo-order",
		"--decorate=full",
		fmt.Sprintf("-n%d", options.CommitsToLoad),
	}
	
	// Add merge handling
	if options.IncludeMerges {
		args = append(args, "--diff-merges=first-parent")
	} else {
		args = append(args, "--no-merges")
	}
	
	// Add search query if provided (safely escaped)
	if options.SearchQuery != "" {
		args = append(args, "--grep="+options.SearchQuery, "--all-match")
	}
	
	// Add author filter if provided (safely escaped)
	if options.Author != "" {
		args = append(args, "--author="+options.Author)
	}
	
	// Add commit range if provided
	if options.FromRef != "" && options.ToRef != "" {
		args = append(args, options.FromRef+".."+options.ToRef)
	} else if options.FromRef != "" {
		args = append(args, options.FromRef)
	}

	cmd := exec.Command("git", args...)
	cmd.Dir = repoPath

	cmdOutput := runCommandAndLogErr(cmd)
	outputLines := strings.Split(cmdOutput, "\n")
	
	parsedLogs := parseGitLogOutput(outputLines)
	Log.Info("Parsed logs: %v", PrettyPrint(parsedLogs))
	return parsedLogs
}

func getBranches(repoPath string) []GitRef {
	Log.Info("Getting branches for repo: %v", repoPath)
	
	branches := []GitRef{}
	currentBranch := getCurrentBranchName(repoPath)
	
	// Get local branches
	cmd := exec.Command("git", "branch", "-v")
	cmd.Dir = repoPath
	localOutput := runCommandAndLogErr(cmd)
	
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
	remoteOutput := runCommandAndLogErr(cmd)
	
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
	Log.Info("Getting tags for repo: %v", repoPath)
	
	tags := []GitRef{}
	
	// Get all tags with their hashes
	cmd := exec.Command("git", "tag", "-l")
	cmd.Dir = repoPath
	tagOutput := runCommandAndLogErr(cmd)
	
	for _, line := range strings.Split(tagOutput, "\n") {
		tagName := strings.TrimSpace(line)
		if tagName == "" {
			continue
		}
		
		// Get the hash for this tag (safely escaped)
		hashCmd := exec.Command("git", "rev-list", "-n", "1", tagName)
		hashCmd.Dir = repoPath
		hash := strings.TrimSpace(runCommandAndLogErr(hashCmd))
		
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
	Log.Info("Fetching %s/%s for repo: %v", remote, ref, repoPath)
	
	var cmd *exec.Cmd
	if ref == "" {
		// Fetch all refs from remote
		cmd = exec.Command("git", "fetch", remote)
	} else {
		// Fetch specific ref from remote
		cmd = exec.Command("git", "fetch", remote, ref)
	}
	
	cmd.Dir = repoPath
	output, err := cmd.CombinedOutput()
	
	if err != nil {
		Log.Error("Error fetching %s/%s: %v, output: %s", remote, ref, err, string(output))
		return fmt.Errorf("failed to fetch %s/%s: %v", remote, ref, err)
	}
	
	Log.Info("Successfully fetched %s/%s", remote, ref)
	return nil
}
