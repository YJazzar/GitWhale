package git_operations

import (
	"fmt"
	"gitwhale/backend/command_utils"
	"gitwhale/backend/logger"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
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

// StagingDiffInfo represents information about a staging area diff session
type StagingDiffInfo struct {
	SessionId  string    `json:"sessionId"`
	FilePath   string    `json:"filePath"`
	FileType   string    `json:"fileType"`
	LeftPath   string    `json:"leftPath"`
	RightPath  string    `json:"rightPath"`
	LeftLabel  string    `json:"leftLabel"`
	RightLabel string    `json:"rightLabel"`
	CreatedAt  time.Time `json:"createdAt"`
}

// GetGitStatus retrieves the current Git status for a repository
func GetGitStatus(repoPath string) (*GitStatus, error) {
	logger.Log.Info("Getting Git status for repo: %v", repoPath)

	cmd := exec.Command("git", "status", "--porcelain=v1", "-z")
	cmd.Dir = repoPath
	output, err, exitCode := command_utils.RunCommandAndLogErr(cmd)
	if err != nil || exitCode != 0 {
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
	_, err, exitCode := command_utils.RunCommandAndLogErr(cmd)
	if err != nil || exitCode != 0 {
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
	_, err, exitCode := command_utils.RunCommandAndLogErr(cmd)
	if err != nil || exitCode != 0 {
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
	_, err, exitCode := command_utils.RunCommandAndLogErr(cmd)
	if err != nil || exitCode != 0 {
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
	_, err, exitCode := command_utils.RunCommandAndLogErr(cmd)
	if err != nil || exitCode != 0 {
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
	output, err, exitCode := command_utils.RunCommandAndLogErr(cmd)
	if err != nil || exitCode != 0 {
		return fmt.Errorf("failed to commit changes: %v", err)
	}

	logger.Log.Info("Successfully committed changes: %s", strings.TrimSpace(output))
	return nil
}

// GetFileContentFromRef gets the content of a file from a specific Git ref (HEAD, staged index, etc.)
func GetFileContentFromRef(repoPath, filePath, ref string) (string, error) {
	logger.Log.Debug("Getting file content for %s from ref %s in repo %s", filePath, ref, repoPath)

	var cmd *exec.Cmd
	if ref == "HEAD" {
		// Get file content from HEAD
		cmd = exec.Command("git", "show", fmt.Sprintf("HEAD:%s", filePath))
	} else if ref == "index" || ref == "staged" {
		// Get file content from staging area
		cmd = exec.Command("git", "show", fmt.Sprintf(":%s", filePath))
	} else {
		// Get file content from specific ref
		cmd = exec.Command("git", "show", fmt.Sprintf("%s:%s", ref, filePath))
	}

	cmd.Dir = repoPath
	output, err, exitCode := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		// If file doesn't exist in this ref, return empty content
		if exitCode == 128 || strings.Contains(output, "does not exist") || strings.Contains(output, "Path '"+filePath+"' does not exist") {
			logger.Log.Debug("File %s does not exist in ref %s", filePath, ref)
			return output, nil
		}
		return "", fmt.Errorf("failed to get file content from %s: %v", ref, err)
	}

	return output, nil
}

// GetWorkingDirectoryFileContent gets the current working directory content of a file
func GetWorkingDirectoryFileContent(repoPath, filePath string) (string, error) {
	logger.Log.Debug("Getting working directory content for %s in repo %s", filePath, repoPath)

	fullPath := filepath.Join(repoPath, filePath)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			logger.Log.Debug("File %s does not exist in working directory", filePath)
			return fmt.Sprintf("File %s does not exist in working directory", filePath), nil
		}
		return "", fmt.Errorf("failed to read working directory file %s: %v", filePath, err)
	}

	return string(content), nil
}

// CreateStagingDiffSession creates temporary files for staging area diff viewing
func CreateStagingDiffSession(repoPath, filePath string, fileType string) (*StagingDiffInfo, error) {
	logger.Log.Info("Creating staging diff session for %s (type: %s) in repo %s", filePath, fileType, repoPath)

	// Create session ID and temp directories
	sessionId := fmt.Sprintf("staging_%d", time.Now().UnixNano())
	tempDir := os.TempDir()
	sessionDir := filepath.Join(tempDir, "gitwhale-staging", sessionId)

	leftPath := filepath.Join(sessionDir, "left")
	rightPath := filepath.Join(sessionDir, "right")

	if err := os.MkdirAll(leftPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create left directory: %v", err)
	}

	if err := os.MkdirAll(rightPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create right directory: %v", err)
	}

	// Determine what to compare based on file type
	var leftContent, rightContent string
	var leftLabel, rightLabel string
	var err1, err2 error

	switch fileType {
	case "staged":
		// Compare HEAD vs staged
		leftContent, err1 = GetFileContentFromRef(repoPath, filePath, "HEAD")
		rightContent, err2 = GetFileContentFromRef(repoPath, filePath, "staged")
		leftLabel = "HEAD"
		rightLabel = "Staged"
	case "unstaged":
		// Compare staged vs working directory
		leftContent, err1 = GetFileContentFromRef(repoPath, filePath, "staged")
		rightContent, err2 = GetWorkingDirectoryFileContent(repoPath, filePath)
		leftLabel = "Staged"
		rightLabel = "Working"
	case "untracked":
		// Compare empty vs working directory
		leftContent = ""
		rightContent, err1 = GetWorkingDirectoryFileContent(repoPath, filePath)
		leftLabel = "Empty"
		rightLabel = "Working"
	default:
		return nil, fmt.Errorf("unsupported file type for diff: %s", fileType)
	}

	if err1 != nil {
		os.RemoveAll(sessionDir)
		return nil, fmt.Errorf("failed to get file content: %v", err1)
	}

	if err2 != nil {
		os.RemoveAll(sessionDir)
		return nil, fmt.Errorf("failed to get file content: %v", err2)
	}

	// Write temporary files
	fileName := filepath.Base(filePath)
	leftFilePath := filepath.Join(leftPath, fileName)
	rightFilePath := filepath.Join(rightPath, fileName)

	if err := os.WriteFile(leftFilePath, []byte(leftContent), 0644); err != nil {
		os.RemoveAll(sessionDir)
		return nil, fmt.Errorf("failed to write left file: %v", err)
	}

	if err := os.WriteFile(rightFilePath, []byte(rightContent), 0644); err != nil {
		os.RemoveAll(sessionDir)
		return nil, fmt.Errorf("failed to write right file: %v", err)
	}

	diffInfo := &StagingDiffInfo{
		SessionId:  sessionId,
		FilePath:   filePath,
		FileType:   fileType,
		LeftPath:   leftFilePath,
		RightPath:  rightFilePath,
		LeftLabel:  leftLabel,
		RightLabel: rightLabel,
		CreatedAt:  time.Now(),
	}

	logger.Log.Info("Created staging diff session: %s", sessionId)
	return diffInfo, nil
}

// CleanupStagingDiffSession cleans up temporary files for a staging diff session
func CleanupStagingDiffSession(sessionId string) error {
	tempDir := os.TempDir()
	sessionDir := filepath.Join(tempDir, "gitwhale-staging", sessionId)

	logger.Log.Info("Cleaning up staging diff session: %s", sessionId)
	err := os.RemoveAll(sessionDir)
	if err != nil {
		logger.Log.Error("Failed to cleanup staging diff session %s: %v", sessionId, err)
		return err
	}
	return nil
}
