package git_operations

import (
	"errors"
	"fmt"
	"gitwhale/backend/command_utils"
	"gitwhale/backend/lib"
	"gitwhale/backend/logger"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
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

// DiffSource represents the context that a diff came from.
type DiffSource string

const (
	// DiffSourceWorking compares staged vs working tree.
	DiffSourceWorking DiffSource = "working"
	// DiffSourceStaged compares HEAD vs staged.
	DiffSourceStaged DiffSource = "staged"
)

// DiffHunk represents a single hunk within a diff.
type DiffHunk struct {
	ID           string `json:"id"`
	Header       string `json:"header"`
	OldStart     int    `json:"oldStart"`
	OldLines     int    `json:"oldLines"`
	NewStart     int    `json:"newStart"`
	NewLines     int    `json:"newLines"`
	AddedLines   int    `json:"addedLines"`
	RemovedLines int    `json:"removedLines"`
	Preview      string `json:"preview"`
	Patch        string `json:"patch"`
}

// FileDiffPatch groups hunks and metadata for a file diff.
type FileDiffPatch struct {
	FilePath string     `json:"filePath"`
	Source   DiffSource `json:"source"`
	Metadata string     `json:"metadata"`
	Hunks    []DiffHunk `json:"hunks"`
	IsBinary bool       `json:"isBinary"`
}

var diffHunkHeaderRegex = regexp.MustCompile(`^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@`)

func parseHunkRange(value string) int {
	if value == "" {
		return 1
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 1
	}
	if parsed == 0 {
		return 1
	}
	return parsed
}

func parseGitDiffOutput(filePath string, source DiffSource, diffOutput string) (*FileDiffPatch, error) {
	lines := strings.Split(diffOutput, "\n")
	metadataLines := []string{}
	hunks := []DiffHunk{}

	var currentHunkLines []string
	addMetadata := true
	addedLines := 0
	removedLines := 0
	previewLines := []string{}
	var match []string

	flushCurrentHunk := func() {
		if len(currentHunkLines) == 0 {
			return
		}

		header := currentHunkLines[0]
		match = diffHunkHeaderRegex.FindStringSubmatch(header)
		if match == nil {
			currentHunkLines = nil
			addedLines = 0
			removedLines = 0
			previewLines = nil
			return
		}

		oldStart, _ := strconv.Atoi(match[1])
		oldLines := parseHunkRange(match[2])
		newStart, _ := strconv.Atoi(match[3])
		newLines := parseHunkRange(match[4])

		preview := ""
		if len(previewLines) > 0 {
			preview = strings.Join(previewLines, "\n")
		}

		if !strings.HasSuffix(currentHunkLines[len(currentHunkLines)-1], "\n") {
			currentHunkLines[len(currentHunkLines)-1] = currentHunkLines[len(currentHunkLines)-1] + "\n"
		}

		patchBuilder := strings.Builder{}
		for _, line := range currentHunkLines {
			if !strings.HasSuffix(line, "\n") {
				patchBuilder.WriteString(line)
				patchBuilder.WriteString("\n")
			} else {
				patchBuilder.WriteString(line)
			}
		}

		hunkHash := lib.HashString(fmt.Sprintf("%s:%s:%d:%d:%d", filePath, source, oldStart, newStart, len(hunks)))
		hunkID := fmt.Sprintf("%08x", hunkHash)
		hunks = append(hunks, DiffHunk{
			ID:           hunkID,
			Header:       header,
			OldStart:     oldStart,
			OldLines:     oldLines,
			NewStart:     newStart,
			NewLines:     newLines,
			AddedLines:   addedLines,
			RemovedLines: removedLines,
			Preview:      preview,
			Patch:        patchBuilder.String(),
		})

		currentHunkLines = nil
		addedLines = 0
		removedLines = 0
		previewLines = nil
	}

	for _, line := range lines {
		switch {
		case diffHunkHeaderRegex.MatchString(line):
			flushCurrentHunk()
			addMetadata = false
			currentHunkLines = []string{line}
			addedLines = 0
			removedLines = 0
			previewLines = []string{}
		case strings.HasPrefix(line, "diff --git "):
			addMetadata = true
			flushCurrentHunk()
			metadataLines = append(metadataLines, line)
		case addMetadata && (strings.HasPrefix(line, "index ") || strings.HasPrefix(line, "---") || strings.HasPrefix(line, "+++") || strings.HasPrefix(line, "new file mode") || strings.HasPrefix(line, "deleted file mode") || strings.HasPrefix(line, "similarity index") || strings.HasPrefix(line, "rename from") || strings.HasPrefix(line, "rename to")):
			metadataLines = append(metadataLines, line)
		default:
			if currentHunkLines != nil {
				currentHunkLines = append(currentHunkLines, line)
				if strings.HasPrefix(line, "+") && !strings.HasPrefix(line, "+++") {
					addedLines++
					if len(previewLines) < 4 {
						previewLines = append(previewLines, line)
					}
				} else if strings.HasPrefix(line, "-") && !strings.HasPrefix(line, "---") {
					removedLines++
					if len(previewLines) < 4 {
						previewLines = append(previewLines, line)
					}
				} else if len(previewLines) < 4 && strings.TrimSpace(line) != "" {
					previewLines = append(previewLines, line)
				}
			} else if addMetadata {
				metadataLines = append(metadataLines, line)
			}
		}
	}

	flushCurrentHunk()

	isBinary := len(hunks) == 0 && strings.Contains(strings.Join(metadataLines, "\n"), "Binary files")

	metadata := strings.Join(metadataLines, "\n")
	if metadata != "" && !strings.HasSuffix(metadata, "\n") {
		metadata += "\n"
	}

	return &FileDiffPatch{
		FilePath: filePath,
		Source:   source,
		Metadata: metadata,
		Hunks:    hunks,
		IsBinary: isBinary,
	}, nil
}

// GetGitStatus retrieves the current Git status for a repository
func GetGitStatus(repoPath string) (*GitStatus, error) {
	logger.Log.Info("Getting Git status for repo: %v", repoPath)

	cmd := exec.Command("git", "status", "--porcelain=v1", "-z")
	cmd.Dir = repoPath
	output, exitCode, err := command_utils.RunCommandAndLogErr(cmd)
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
func StageFile(repoPath string, filePaths []string) error {
	logger.Log.Info("Staging files: %s in repo: %s", filePaths, repoPath)

	commandArgs := []string{"add", "-A", "--"}
	commandArgs = append(commandArgs, filePaths...)

	cmd := exec.Command("git", commandArgs...)
	cmd.Dir = repoPath
	_, exitCode, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil || exitCode != 0 {
		return fmt.Errorf("failed to stage file %s: %v", filePaths, err)
	}

	logger.Log.Info("Successfully staged file: %s", filePaths)
	return nil
}

// UnstageFile unstages a specific file
func UnstageFile(repoPath string, filePaths []string) error {
	logger.Log.Info("Unstaging files: %s in repo: %s", filePaths, repoPath)

	commandArgs := []string{"reset", "HEAD", "--"}
	commandArgs = append(commandArgs, filePaths...)

	cmd := exec.Command("git", commandArgs...)
	cmd.Dir = repoPath
	_, exitCode, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil || exitCode != 0 {
		return fmt.Errorf("failed to unstage file %s: %v", filePaths, err)
	}

	logger.Log.Info("Successfully unstaged file: %s", filePaths)
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
	output, exitCode, err := command_utils.RunCommandAndLogErr(cmd)
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
	output, exitCode, err := command_utils.RunCommandAndLogErr(cmd)
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

func buildPatchFromHunks(patch *FileDiffPatch, hunkIDs []string) (string, error) {
	if patch == nil {
		return "", errors.New("diff patch was nil")
	}

	if len(hunkIDs) == 0 {
		return "", errors.New("no hunks selected")
	}

	hunkSet := make(map[string]bool, len(hunkIDs))
	for _, id := range hunkIDs {
		hunkSet[id] = true
	}

	var builder strings.Builder
	if patch.Metadata != "" {
		builder.WriteString(patch.Metadata)
		if !strings.HasSuffix(patch.Metadata, "\n") {
			builder.WriteString("\n")
		}
	}

	matched := 0
	for _, hunk := range patch.Hunks {
		if !hunkSet[hunk.ID] {
			continue
		}

		builder.WriteString(hunk.Patch)
		if !strings.HasSuffix(hunk.Patch, "\n") {
			builder.WriteString("\n")
		}
		matched++
	}

	if matched == 0 {
		return "", fmt.Errorf("no matching hunks found for file %s", patch.FilePath)
	}

	builder.WriteString("\n")
	return builder.String(), nil
}

func applyPatch(repoPath string, patchPayload string, args ...string) error {
	if strings.TrimSpace(patchPayload) == "" {
		return errors.New("patch payload was empty")
	}

	commandArgs := append([]string{"apply"}, args...)
	cmd := exec.Command("git", commandArgs...)
	cmd.Dir = repoPath
	cmd.Stdin = strings.NewReader(patchPayload)

	_, exitCode, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		return fmt.Errorf("git apply failed: %w", err)
	}

	if exitCode != 0 {
		return fmt.Errorf("git apply exited with code %d", exitCode)
	}

	return nil
}

func StageDiffHunks(repoPath, filePath string, hunkIDs []string) error {
	logger.Log.Info("Staging hunks %v for %s", hunkIDs, filePath)

	patch, err := GetFileDiffPatch(repoPath, filePath, DiffSourceWorking)
	if err != nil {
		return err
	}

	payload, err := buildPatchFromHunks(patch, hunkIDs)
	if err != nil {
		return err
	}

	return applyPatch(repoPath, payload, "--cached", "--whitespace=nowarn")
}

func UnstageDiffHunks(repoPath, filePath string, hunkIDs []string) error {
	logger.Log.Info("Unstaging hunks %v for %s", hunkIDs, filePath)

	patch, err := GetFileDiffPatch(repoPath, filePath, DiffSourceStaged)
	if err != nil {
		return err
	}

	payload, err := buildPatchFromHunks(patch, hunkIDs)
	if err != nil {
		return err
	}

	return applyPatch(repoPath, payload, "--cached", "--reverse", "--whitespace=nowarn")
}

func RevertDiffHunks(repoPath, filePath string, hunkIDs []string) error {
	logger.Log.Info("Reverting hunks %v for %s", hunkIDs, filePath)

	patch, err := GetFileDiffPatch(repoPath, filePath, DiffSourceWorking)
	if err != nil {
		return err
	}

	payload, err := buildPatchFromHunks(patch, hunkIDs)
	if err != nil {
		return err
	}

	return applyPatch(repoPath, payload, "--reverse", "--whitespace=nowarn")
}

func GetFileDiffPatch(repoPath, filePath string, source DiffSource) (*FileDiffPatch, error) {
	logger.Log.Debug("Generating diff patch for %s (%s)", filePath, source)

	gitArgs := []string{"diff", "--no-color", "--unified=4", "--", filePath}
	switch source {
	case DiffSourceStaged:
		gitArgs = []string{"diff", "--cached", "--no-color", "--unified=4", "--", filePath}
	case DiffSourceWorking:
		// default args already handle working tree vs index
	default:
		return nil, fmt.Errorf("unsupported diff source: %s", source)
	}

	cmd := exec.Command("git", gitArgs...)
	cmd.Dir = repoPath
	diffOutput, exitCode, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		return nil, fmt.Errorf("failed to generate git diff for %s: %w", filePath, err)
	}

	if exitCode != 0 {
		return nil, fmt.Errorf("git diff returned non-zero exit code (%d) for %s", exitCode, filePath)
	}

	if strings.TrimSpace(diffOutput) == "" {
		return &FileDiffPatch{
			FilePath: filePath,
			Source:   source,
			Metadata: "",
			Hunks:    []DiffHunk{},
			IsBinary: false,
		}, nil
	}

	return parseGitDiffOutput(filePath, source, diffOutput)
}
