package git_operations

import (
	"context"
	"crypto/md5"
	"fmt"
	"gitwhale/backend/command_utils"
	"gitwhale/backend/lib"
	"gitwhale/backend/logger"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

type DiffSession struct {
	SessionId         string              `json:"sessionId"`
	RepoPath          string              `json:"repoPath"`
	FromRef           string              `json:"fromRef"`
	ToRef             string              `json:"toRef"`
	LeftPath          string              `json:"leftPath"`
	RightPath         string              `json:"rightPath"`
	CreatedAt         time.Time           `json:"createdAt"`
	LastAccessed      time.Time           `json:"lastAccessed"`
	Title             string              `json:"title"`
	DirectoryData     *Directory          `json:"directoryData"`
	HasDiffData       bool                `json:"hasDiffData"`
	CommitInformation *DetailedCommitInfo `json:"commitInformation"`
}

type DiffOptions struct {
	RepoPath string `json:"repoPath"`

	// Source ref (commit, branch, tag)
	FromRef string `json:"fromRef"`

	// Target ref (commit, branch, tag, or empty for working tree)
	ToRef string `json:"toRef"`

	// Whether the "toRef" property is trying to reference the user's working directory changes, or if the user is diffing a single commit with it's parent
	IsSingleCommitDiff bool `json:"isSingleCommitDiff"`
}

// Parses script output and re-logs [DIFF-SCRIPT] messages through backend Logger
func parseAndRelogScriptOutput(output string) {
	if output == "" {
		logger.Log.Debug("DIFF-SCRIPT had no output to re-log")
		return
	}

	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Check if this is a [DIFF-SCRIPT] message
		if strings.HasPrefix(line, "[DIFF-SCRIPT]") {
			// Remove the [DIFF-SCRIPT] prefix for cleaner backend logging
			message := strings.TrimSpace(strings.TrimPrefix(line, "[DIFF-SCRIPT]"))

			// Determine log level based on message content
			if strings.Contains(message, "ERROR:") {
				logger.Log.Error("DIFF-SCRIPT: %s", message)
			} else if strings.Contains(message, "Starting") || strings.Contains(message, "completed") {
				logger.Log.Info("DIFF-SCRIPT: %s", message)
			} else {
				logger.Log.Debug("DIFF-SCRIPT: %s", message)
			}
		}
	}
}

// Ensures git difftool is configured to use our helper script
func SetupGitDirDiffHelperScript() error {
	scriptPath, err := saveNewHelperDiffScript()
	if err != nil {
		return fmt.Errorf("failed to ensure helper script: %v", err)
	}

	toolName := HELPER_SCRIPT_TOOL_NAME
	configKey := "difftool." + toolName + ".cmd"
	configValue := scriptPath + " \"$LOCAL\" \"$REMOTE\""

	// Check if already configured correctly
	checkCmd := exec.Command("git", "config", "--global", configKey)
	if output, err := command_utils.RunCommandAndLogErr(checkCmd); err == nil {
		currentValue := strings.TrimSpace(string(output))
		if currentValue == configValue {
			logger.Log.Debug("Git difftool already configured correctly")
			return nil
		}
	}

	// Set the configuration
	configCmd := exec.Command("git", "config", "--global", configKey, configValue)
	if _, err := command_utils.RunCommandAndLogErr(configCmd); err != nil {
		return fmt.Errorf("failed to configure git difftool: %v", err)
	}

	logger.Log.Info("Configured git difftool to use helper script: %s", scriptPath)
	return nil
}

// Ensures the helper diff script exists and returns its path
func saveNewHelperDiffScript() (string, error) {
	appFolderPath, err := lib.GetAppFolderPath()
	if err != nil {
		return "", err
	}

	var scriptName, scriptContent string
	if runtime.GOOS == "windows" {
		scriptName = "gitwhale-diff.bat"
		scriptContent = WINDOWS_HELPER_SCRIPT_CONTENTS
	} else {
		scriptName = "gitwhale-diff.sh"
		scriptContent = UNIX_HELPER_SCRIPT_CONTENTS
	}

	scriptPath := filepath.Join(appFolderPath, scriptName)
	scriptPath, err = filepath.Abs(scriptPath)
	if err != nil {
		return "", fmt.Errorf("failed to resolve the path where the helper script should be saved to: %v", err)
	}
	scriptPath = filepath.Clean(scriptPath)
	if runtime.GOOS == "windows" {
		scriptPath = strings.Replace(scriptPath, "\\", "/", -1)
	}

	// Create the script
	err = os.WriteFile(scriptPath, []byte(scriptContent), 0755)
	if err != nil {
		return "", fmt.Errorf("failed to write helper script: %v", err)
	}

	logger.Log.Info("Created helper diff script: %s", scriptPath)
	return scriptPath, nil
}

// Creates a new diff session with simplified flow
func CreateDiffSession(options DiffOptions) (*DiffSession, error) {
	logger.Log.Info("Creating diff session for repo: %s, from: %s, to: %s", options.RepoPath, options.FromRef, options.ToRef)

	if options.IsSingleCommitDiff {
		options.ToRef = fmt.Sprintf("%s^", options.FromRef)
	}

	// Step 1: Validate all inputs
	if err := validateDiffInputs(options); err != nil {
		return nil, err
	}

	// Step 2: Generate session ID and create destinations
	sessionId := generateSessionId(options)
	logger.Log.Debug("Created diff session ID: %s", sessionId)

	leftPath, rightPath, err := createDiffDestinations(sessionId)
	if err != nil {
		return nil, err
	}

	// Step 3: Execute enhanced script (does all the copying)
	changesFound, err := executeDiffScript(options.RepoPath, options.FromRef, options.ToRef, leftPath, rightPath)
	if err != nil {
		CleanupDiffSession(sessionId) // Cleanup on failure
		return nil, err
	}

	// Step 4: Create session object
	session := &DiffSession{
		SessionId:         sessionId,
		RepoPath:          options.RepoPath,
		FromRef:           options.FromRef,
		ToRef:             options.ToRef,
		LeftPath:          leftPath,
		RightPath:         rightPath,
		CreatedAt:         time.Now(),
		LastAccessed:      time.Now(),
		Title:             generateDiffTitle(options),
		DirectoryData:     nil,
		HasDiffData:       changesFound,
		CommitInformation: nil,
	}

	if !changesFound {
		CleanupDiffSession(sessionId)
		return session, nil
	}

	if options.IsSingleCommitDiff {
		session.CommitInformation, err = GetDetailedCommitInfo(options.RepoPath, options.FromRef)
		if err != nil {
			CleanupDiffSession(sessionId)
			return nil, fmt.Errorf("failed to load detailed information about the commit %s", options.FromRef)
		}
	}

	// Step 5: Load directory structure
	session.DirectoryData = GetDiffSessionDirectory(session)
	if session.DirectoryData == nil {
		CleanupDiffSession(sessionId)
		return nil, fmt.Errorf("failed to load directory structure for diff session")
	}

	logger.Log.Info("Created diff session: %s", sessionId)
	return session, nil
}

// Validates all inputs required for diff operation
func validateDiffInputs(options DiffOptions) error {
	// Check repository path exists
	if options.RepoPath == "" {
		return fmt.Errorf("repository path cannot be empty")
	}

	if _, err := os.Stat(options.RepoPath); os.IsNotExist(err) {
		return fmt.Errorf("repository path does not exist: %s", options.RepoPath)
	}

	// Check if it's a git repository
	// TODO: only need to check then when opening a repo. Move there please
	cmd := exec.Command("git", "rev-parse", "--git-dir")
	cmd.Dir = options.RepoPath
	if _, err := command_utils.RunCommandAndLogErr(cmd); err != nil {
		return fmt.Errorf("not a valid git repository: %s", options.RepoPath)
	}

	// Validate refs if provided
	if err := validateGitRef(options.RepoPath, options.FromRef); err != nil {
		return fmt.Errorf("invalid fromRef: %v", err)
	}

	if err := validateGitRef(options.RepoPath, options.ToRef); err != nil {
		return fmt.Errorf("invalid toRef: %v", err)
	}

	// At least one ref must be specified
	if options.FromRef == "" && options.ToRef == "" {
		return fmt.Errorf("at least one reference must be specified")
	}

	return nil
}

// Validates that a git ref exists and is valid
func validateGitRef(repoPath, ref string) error {
	if ref == "" {
		return nil
	}

	cmd := exec.Command("git", "rev-parse", "--verify", ref+"^{commit}")
	cmd.Dir = repoPath
	output, err := command_utils.RunCommandAndLogErr(cmd)
	if err != nil {
		gitError := strings.TrimSpace(string(output))
		if gitError != "" {
			return fmt.Errorf("invalid git reference '%s': %s", ref, gitError)
		}
		return fmt.Errorf("invalid git reference '%s'", ref)
	}

	logger.Log.Debug("Validated git ref '%s' in repo %s", ref, repoPath)
	return nil
}

// Creates destination directories for diff session
func createDiffDestinations(sessionId string) (leftPath, rightPath string, err error) {
	tempDir := os.TempDir()
	sessionDir := filepath.Join(tempDir, "gitwhale-diff", sessionId)

	leftPath = filepath.Join(sessionDir, "left")
	rightPath = filepath.Join(sessionDir, "right")

	if err = os.MkdirAll(leftPath, 0755); err != nil {
		return "", "", fmt.Errorf("failed to create left directory: %v", err)
	}

	if err = os.MkdirAll(rightPath, 0755); err != nil {
		return "", "", fmt.Errorf("failed to create right directory: %v", err)
	}

	return leftPath, rightPath, nil
}

// Executes the diff script using helper script and environment variables
// Boolean is for whether there were any changes found
func executeDiffScript(repoPath, fromRef, toRef, leftDest, rightDest string) (bool, error) {
	logger.Log.Info("Starting diff operation for repo: %s,  %s -> %s", repoPath, fromRef, toRef)
	logger.Log.Debug("Diff destinations - Left: %s, Right: %s", leftDest, rightDest)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Build git difftool command
	toolName := HELPER_SCRIPT_TOOL_NAME
	var cmdArgs []string
	if toRef == "" {
		cmdArgs = []string{"difftool", "-d", "--tool=" + toolName, "--no-prompt", fromRef}
	} else {
		cmdArgs = []string{"difftool", "-d", "--tool=" + toolName, "--no-prompt", fromRef, toRef}
	}

	// Execute git difftool with environment variables
	cmd := exec.CommandContext(ctx, "git", cmdArgs...)
	cmd.Dir = repoPath

	// Set environment variables for the script
	envVars := []string{
		"GITWHALE_LEFT_DEST=" + leftDest,
		"GITWHALE_RIGHT_DEST=" + rightDest,
	}
	cmd.Env = append(os.Environ(), envVars...)

	// Log detailed command information
	logger.Log.Debug("Executing git difftool command: %s", strings.Join(cmdArgs, " "))
	logger.Log.Debug("Working directory: %s", repoPath)
	logger.Log.Debug("Environment variables: %v", envVars)
	logger.Log.Debug("Command timeout: 60 seconds")

	startTime := time.Now()
	outputStr, err := command_utils.RunCommandAndLogErr(cmd)
	duration := time.Since(startTime)

	logger.Log.Debug("Git difftool execution completed in %v", duration)
	logger.Log.Debug("Git difftool output length: %d bytes", len(outputStr))
	if len(outputStr) > 0 {
		logger.Log.Debug("Git difftool output: %s", outputStr)
	}

	// Parse and re-log [DIFF-SCRIPT] messages through backend Logger (for both success and error cases)
	parseAndRelogScriptOutput(outputStr)

	if len(outputStr) == 0 {
		logger.Log.Debug("Git difftool found changes")
		return false, nil
	}

	if err != nil {
		logger.Log.Error("Git difftool command failed with error: %v", err)

		// Check for exit error to get more details
		if exitError, ok := err.(*exec.ExitError); ok {
			logger.Log.Error("Git difftool exit code: %d", exitError.ExitCode())
			logger.Log.Error("Git difftool stderr: %s", string(exitError.Stderr))
		}

		// Check if it's a git error
		if strings.Contains(outputStr, "fatal:") || strings.Contains(outputStr, "error:") {
			logger.Log.Error("Git reported error in difftool operation: %s", outputStr)
			return false, fmt.Errorf("git difftool failed: %s", outputStr)
		}

		logger.Log.Error("Diff operation failed with non-git error: %v", err)
		return false, fmt.Errorf("diff operation failed: %v", err)
	}

	logger.Log.Debug("Git difftool command completed successfully")

	// Check script output for success/failure
	if strings.Contains(outputStr, "ERROR:") {
		logger.Log.Error("Diff script reported error in output: %s", outputStr)

		// Extract error message
		lines := strings.Split(outputStr, "\n")
		for _, line := range lines {
			if strings.HasPrefix(line, "ERROR:") {
				errorMsg := strings.TrimPrefix(line, "ERROR:")
				logger.Log.Error("Extracted error message: %s", errorMsg)
				return false, fmt.Errorf("diff script failed: %s", errorMsg)
			}
		}
		logger.Log.Error("Error indicator found but no specific error message extracted")
		return false, fmt.Errorf("diff script failed with unknown error")
	}

	if !strings.Contains(outputStr, "SUCCESS") {
		logger.Log.Warning("No SUCCESS indicator found in diff script output: %s", outputStr)
		return false, fmt.Errorf("diff script did not report success: %s", outputStr)
	}

	logger.Log.Debug("Diff script reported success: found SUCCESS indicator")
	logger.Log.Info("Diff operation completed successfully")
	return true, nil
}

func generateSessionId(options DiffOptions) string {
	data := fmt.Sprintf("%s-%s-%s-%d", options.RepoPath, options.FromRef, options.ToRef, time.Now().UnixNano())
	hash := md5.Sum([]byte(data))
	return fmt.Sprintf("diff_%x", hash)[:16]
}

func generateDiffTitle(options DiffOptions) string {
	if options.ToRef == "" {
		return fmt.Sprintf("%s vs Working Tree", options.FromRef)
	}
	return fmt.Sprintf("%s vs %s", options.FromRef, options.ToRef)
}

func CleanupDiffSession(sessionId string) error {
	tempDir := os.TempDir()
	sessionDir := filepath.Join(tempDir, "gitwhale-diff", sessionId)

	logger.Log.Info("Cleaning up diff session: %s", sessionId)
	err := os.RemoveAll(sessionDir)
	if err != nil {
		logger.Log.Error("Failed to cleanup diff session %s: %v", sessionId, err)
		return err
	}
	return nil
}

func GetDiffSessionDirectory(session *DiffSession) *Directory {
	if session == nil {
		logger.Log.Warning("Attempted to run a GetDiffSessionDirectory(), but was provided a nil session")
		return nil
	}

	logger.Log.Info("Getting directory structure for diff session: %s", session.SessionId)
	session.LastAccessed = time.Now()

	return ReadDiffs(session.LeftPath, session.RightPath)
}

func CleanupOldDiffSessions() error {
	tempDir := os.TempDir()
	diffDir := filepath.Join(tempDir, "gitwhale-diff")

	entries, err := os.ReadDir(diffDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	cutoff := time.Now().Add(-24 * time.Hour)
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		sessionPath := filepath.Join(diffDir, entry.Name())
		info, err := entry.Info()
		if err != nil {
			continue
		}

		if info.ModTime().Before(cutoff) {
			logger.Log.Info("Cleaning up old diff session: %s", entry.Name())
			os.RemoveAll(sessionPath)
		}
	}

	return nil
}
