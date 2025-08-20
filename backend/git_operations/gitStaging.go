package git_operations

import (
	"fmt"
	"gitwhale/backend/command_utils"
	"gitwhale/backend/logger"
	"os/exec"
	"strings"
)

// GitStatusFile represents a file in the Git status output
type GitStatusFile struct {
	Path          string `json:"path"`
	Status        string `json:"status"`        // Combined status (e.g., "M ", "A ", " M", "??")
	StagedStatus  string `json:"stagedStatus"`  // Index status (first character)
	WorkingStatus string `json:"workingStatus"` // Working tree status (second character)
	OldPath       string `json:"oldPath"`       // For renames, the original path
}

// GitStatus represents the overall Git status
type GitStatus struct {
	StagedFiles    []GitStatusFile `json:"stagedFiles"`
	UnstagedFiles  []GitStatusFile `json:"unstagedFiles"`
	UntrackedFiles []GitStatusFile `json:"untrackedFiles"`
	HasChanges     bool            `json:"hasChanges"`
}

// GetGitStatus retrieves the current Git status for a repository
func GetGitStatus(repoPath string) (*GitStatus, error) {
	logger.Log.Info("Getting Git status for repo: %v", repoPath)

	cmd := exec.Command("git", "status", "--porcelain=v1", "-z")
	cmd.Dir = repoPath
	output, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		return nil, fmt.Errorf("failed to get git status: %v", err)
	}

	status := &GitStatus{
		StagedFiles:    []GitStatusFile{},
		UnstagedFiles:  []GitStatusFile{},
		UntrackedFiles: []GitStatusFile{},
	}

	if output == "" {
		return status, nil
	}

	// Parse null-separated output
	entries := strings.Split(strings.TrimSuffix(output, "\x00"), "\x00")
	
	for _, entry := range entries {
		if len(entry) < 3 {
			continue
		}

		statusChars := entry[:2]
		filePath := entry[3:]
		
		stagedStatus := string(statusChars[0])
		workingStatus := string(statusChars[1])

		gitFile := GitStatusFile{
			Path:          filePath,
			Status:        statusChars,
			StagedStatus:  stagedStatus,
			WorkingStatus: workingStatus,
		}

		// Handle renames (format: "R  old_name\x00new_name")
		if stagedStatus == "R" || stagedStatus == "C" {
			// For renames, Git outputs both old and new names
			if strings.Contains(filePath, "\x00") {
				parts := strings.Split(filePath, "\x00")
				if len(parts) == 2 {
					gitFile.OldPath = parts[0]
					gitFile.Path = parts[1]
				}
			}
		}

		// Categorize the file based on its status
		if stagedStatus != " " && stagedStatus != "?" {
			// File has staged changes
			status.StagedFiles = append(status.StagedFiles, gitFile)
		}
		
		if workingStatus != " " && workingStatus != "?" {
			// File has unstaged changes
			status.UnstagedFiles = append(status.UnstagedFiles, gitFile)
		}
		
		if statusChars == "??" {
			// Untracked file
			status.UntrackedFiles = append(status.UntrackedFiles, gitFile)
		}
	}

	status.HasChanges = len(status.StagedFiles) > 0 || len(status.UnstagedFiles) > 0 || len(status.UntrackedFiles) > 0

	logger.Log.Info("Git status retrieved: %d staged, %d unstaged, %d untracked files", 
		len(status.StagedFiles), len(status.UnstagedFiles), len(status.UntrackedFiles))

	return status, nil
}

// StageFile stages a specific file
func StageFile(repoPath, filePath string) error {
	logger.Log.Info("Staging file: %s in repo: %s", filePath, repoPath)

	cmd := exec.Command("git", "add", filePath)
	cmd.Dir = repoPath
	_, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		return fmt.Errorf("failed to stage file %s: %v", filePath, err)
	}

	logger.Log.Info("Successfully staged file: %s", filePath)
	return nil
}

// UnstageFile unstages a specific file
func UnstageFile(repoPath, filePath string) error {
	logger.Log.Info("Unstaging file: %s in repo: %s", filePath, repoPath)

	cmd := exec.Command("git", "reset", "HEAD", filePath)
	cmd.Dir = repoPath
	_, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		return fmt.Errorf("failed to unstage file %s: %v", filePath, err)
	}

	logger.Log.Info("Successfully unstaged file: %s", filePath)
	return nil
}

// StageAllFiles stages all unstaged and untracked files
func StageAllFiles(repoPath string) error {
	logger.Log.Info("Staging all files in repo: %s", repoPath)

	cmd := exec.Command("git", "add", ".")
	cmd.Dir = repoPath
	_, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		return fmt.Errorf("failed to stage all files: %v", err)
	}

	logger.Log.Info("Successfully staged all files")
	return nil
}

// UnstageAllFiles unstages all staged files
func UnstageAllFiles(repoPath string) error {
	logger.Log.Info("Unstaging all files in repo: %s", repoPath)

	cmd := exec.Command("git", "reset", "HEAD")
	cmd.Dir = repoPath
	_, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		return fmt.Errorf("failed to unstage all files: %v", err)
	}

	logger.Log.Info("Successfully unstaged all files")
	return nil
}

// CommitChanges commits the staged changes with the provided message
func CommitChanges(repoPath, message string) error {
	logger.Log.Info("Committing changes in repo: %s", repoPath)

	if strings.TrimSpace(message) == "" {
		return fmt.Errorf("commit message cannot be empty")
	}

	cmd := exec.Command("git", "commit", "-m", message)
	cmd.Dir = repoPath
	output, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		return fmt.Errorf("failed to commit changes: %v", err)
	}

	logger.Log.Info("Successfully committed changes: %s", strings.TrimSpace(output))
	return nil
}