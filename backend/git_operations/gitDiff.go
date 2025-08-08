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
	SessionId     string     `json:"sessionId"`
	RepoPath      string     `json:"repoPath"`
	FromRef       string     `json:"fromRef"`
	ToRef         string     `json:"toRef"`
	LeftPath      string     `json:"leftPath"`
	RightPath     string     `json:"rightPath"`
	CreatedAt     time.Time  `json:"createdAt"`
	LastAccessed  time.Time  `json:"lastAccessed"`
	Title         string     `json:"title"`
	DirectoryData *Directory `json:"directoryData"`
}

type DiffOptions struct {
	RepoPath        string   `json:"repoPath"`
	FromRef         string   `json:"fromRef"`         // Source ref (commit, branch, tag)
	ToRef           string   `json:"toRef"`           // Target ref (commit, branch, tag, or empty for working tree)
	FilePathFilters []string `json:"filePathFilters"` // Optional: specific files/dirs to diff
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
	cmd := exec.Command("git", "rev-parse", "--git-dir")
	cmd.Dir = options.RepoPath
	if _, err := command_utils.RunCommandAndLogErr(cmd); err != nil {
		return fmt.Errorf("not a valid git repository: %s", options.RepoPath)
	}

	// Validate refs if provided
	if options.FromRef != "" {
		if err := validateGitRef(options.RepoPath, options.FromRef); err != nil {
			return fmt.Errorf("invalid fromRef: %v", err)
		}
	}

	if options.ToRef != "" {
		if err := validateGitRef(options.RepoPath, options.ToRef); err != nil {
			return fmt.Errorf("invalid toRef: %v", err)
		}
	}

	// At least one ref must be specified
	if options.FromRef == "" && options.ToRef == "" {
		return fmt.Errorf("at least one reference must be specified")
	}

	return nil
}

// Validates that a git ref exists and is valid
func validateGitRef(repoPath, ref string) error {
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
func executeDiffScript(repoPath, fromRef, toRef, leftDest, rightDest string) error {
	logger.Log.Info("Starting diff operation for repo: %s, from: %s, to: %s", repoPath, fromRef, toRef)
	logger.Log.Debug("Diff destinations - Left: %s, Right: %s", leftDest, rightDest)

	// Ensure git difftool is configured with helper script
	logger.Log.Debug("Ensuring git difftool configuration...")
	if err := ensureGitDiffToolConfig(repoPath); err != nil {
		logger.Log.Error("Failed to configure git difftool: %v", err)
		return fmt.Errorf("failed to configure git difftool: %v", err)
	}
	logger.Log.Debug("Git difftool configuration completed successfully")

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Build git difftool command
	toolName := "gitwhale-diff-helper"
	var cmdArgs []string
	if toRef == "" {
		cmdArgs = []string{"difftool", "-d", "--tool=" + toolName, "--no-prompt", fromRef}
		logger.Log.Info("Running git difftool: %s -> working tree", fromRef)
	} else {
		cmdArgs = []string{"difftool", "-d", "--tool=" + toolName, "--no-prompt", fromRef, toRef}
		logger.Log.Info("Running git difftool: %s -> %s", fromRef, toRef)
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
	output, err := command_utils.RunCommandAndLogErr(cmd)
	duration := time.Since(startTime)
	outputStr := strings.TrimSpace(string(output))

	logger.Log.Debug("Git difftool execution completed in %v", duration)
	logger.Log.Debug("Git difftool output length: %d bytes", len(output))
	if len(outputStr) > 0 {
		logger.Log.Debug("Git difftool output: %s", outputStr)
	}

	// Parse and re-log [DIFF-SCRIPT] messages through backend Logger (for both success and error cases)
	if len(outputStr) > 0 {
		parseAndRelogScriptOutput(outputStr)
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
			return fmt.Errorf("git difftool failed: %s", outputStr)
		}

		logger.Log.Error("Diff operation failed with non-git error: %v", err)
		return fmt.Errorf("diff operation failed: %v", err)
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
				return fmt.Errorf("diff script failed: %s", errorMsg)
			}
		}
		logger.Log.Error("Error indicator found but no specific error message extracted")
		return fmt.Errorf("diff script failed with unknown error")
	}

	if !strings.Contains(outputStr, "SUCCESS") {
		logger.Log.Warning("No SUCCESS indicator found in diff script output: %s", outputStr)
		return fmt.Errorf("diff script did not report success: %s", outputStr)
	}

	logger.Log.Debug("Diff script reported success: found SUCCESS indicator")

	logger.Log.Info("Diff operation completed successfully")
	return nil
}

// Parses script output and re-logs [DIFF-SCRIPT] messages through backend Logger
func parseAndRelogScriptOutput(output string) {
	if output == "" {
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

// Ensures the helper diff script exists and returns its path
func ensureHelperDiffScript() (string, error) {
	appFolderPath, err := lib.GetAppFolderPath()
	if err != nil {
		return "", err
	}

	var scriptName, scriptContent string
	if runtime.GOOS == "windows" {
		scriptName = "gitwhale-diff.bat"
		scriptContent = `@echo off
setlocal enabledelayedexpansion

REM GitWhale Diff Script - Windows Batch Version
echo [DIFF-SCRIPT] Starting GitWhale diff script execution
echo [DIFF-SCRIPT] Script arguments: %*
echo [DIFF-SCRIPT] Left source: %1
echo [DIFF-SCRIPT] Right source: %2
echo [DIFF-SCRIPT] Environment check - GITWHALE_LEFT_DEST: %GITWHALE_LEFT_DEST%
echo [DIFF-SCRIPT] Environment check - GITWHALE_RIGHT_DEST: %GITWHALE_RIGHT_DEST%

REM Check if both parameters are provided
if "%1"=="" (
    echo [DIFF-SCRIPT] ERROR: Git difftool did not provide left directory path
    echo ERROR: Git difftool did not provide left directory path
    exit /b 1
)
if "%2"=="" (
    echo [DIFF-SCRIPT] ERROR: Git difftool did not provide right directory path
    echo ERROR: Git difftool did not provide right directory path
    exit /b 1
)

echo [DIFF-SCRIPT] Parameters validated successfully

REM Check if directories exist
if not exist "%1" (
    echo [DIFF-SCRIPT] ERROR: Left directory does not exist: %1
    echo ERROR: Left directory does not exist: %1
    exit /b 1
)
if not exist "%2" (
    echo [DIFF-SCRIPT] ERROR: Right directory does not exist: %2
    echo ERROR: Right directory does not exist: %2
    exit /b 1
)

echo [DIFF-SCRIPT] Source directories verified successfully

REM Check environment variables
if "%GITWHALE_LEFT_DEST%"=="" (
    echo [DIFF-SCRIPT] ERROR: GITWHALE_LEFT_DEST environment variable not set
    echo ERROR: GITWHALE_LEFT_DEST environment variable not set
    exit /b 1
)
if "%GITWHALE_RIGHT_DEST%"=="" (
    echo [DIFF-SCRIPT] ERROR: GITWHALE_RIGHT_DEST environment variable not set
    echo ERROR: GITWHALE_RIGHT_DEST environment variable not set
    exit /b 1
)

echo [DIFF-SCRIPT] Environment variables validated successfully

REM Ensure destination directories exist
echo [DIFF-SCRIPT] Creating destination directories if needed
if not exist "%GITWHALE_LEFT_DEST%" mkdir "%GITWHALE_LEFT_DEST%"
if not exist "%GITWHALE_RIGHT_DEST%" mkdir "%GITWHALE_RIGHT_DEST%"

REM Copy directories using robocopy
echo [DIFF-SCRIPT] Starting copy operation for left directory: %1 -> %GITWHALE_LEFT_DEST%
robocopy "%1" "%GITWHALE_LEFT_DEST%" /E /NFL /NDL /NJH /NJS /NC /NS /NP > nul
set left_exitcode=%errorlevel%
echo [DIFF-SCRIPT] Robocopy left directory exit code: %left_exitcode%

if %left_exitcode% geq 8 (
    echo [DIFF-SCRIPT] ERROR: Failed to copy left directory, exit code: %left_exitcode%
    echo ERROR: Failed to copy left directory
    exit /b 1
)

echo [DIFF-SCRIPT] Left directory copied successfully

echo [DIFF-SCRIPT] Starting copy operation for right directory: %2 -> %GITWHALE_RIGHT_DEST%
robocopy "%2" "%GITWHALE_RIGHT_DEST%" /E /NFL /NDL /NJH /NJS /NC /NS /NP > nul
set right_exitcode=%errorlevel%
echo [DIFF-SCRIPT] Robocopy right directory exit code: %right_exitcode%

if %right_exitcode% geq 8 (
    echo [DIFF-SCRIPT] ERROR: Failed to copy right directory, exit code: %right_exitcode%
    echo ERROR: Failed to copy right directory
    exit /b 1
)

echo [DIFF-SCRIPT] Right directory copied successfully
echo [DIFF-SCRIPT] All operations completed successfully
echo SUCCESS: Directories copied successfully
exit /b 0`
	} else {
		scriptName = "gitwhale-diff.sh"
		scriptContent = `#!/bin/bash
set -e

# GitWhale Diff Script - Bash Version
echo "[DIFF-SCRIPT] Starting GitWhale diff script execution"
echo "[DIFF-SCRIPT] Script arguments: $*"
echo "[DIFF-SCRIPT] Left source: $1"
echo "[DIFF-SCRIPT] Right source: $2"
echo "[DIFF-SCRIPT] Environment check - GITWHALE_LEFT_DEST: $GITWHALE_LEFT_DEST"
echo "[DIFF-SCRIPT] Environment check - GITWHALE_RIGHT_DEST: $GITWHALE_RIGHT_DEST"

# Check if both parameters are provided
if [ -z "$1" ]; then
    echo "[DIFF-SCRIPT] ERROR: Git difftool did not provide left directory path"
    echo "ERROR: Git difftool did not provide left directory path"
    exit 1
fi
if [ -z "$2" ]; then
    echo "[DIFF-SCRIPT] ERROR: Git difftool did not provide right directory path"
    echo "ERROR: Git difftool did not provide right directory path"
    exit 1
fi

echo "[DIFF-SCRIPT] Parameters validated successfully"

# Check if directories exist
if [ ! -d "$1" ]; then
    echo "[DIFF-SCRIPT] ERROR: Left directory does not exist: $1"
    echo "ERROR: Left directory does not exist: $1"
    exit 1
fi
if [ ! -d "$2" ]; then
    echo "[DIFF-SCRIPT] ERROR: Right directory does not exist: $2"
    echo "ERROR: Right directory does not exist: $2"
    exit 1
fi

echo "[DIFF-SCRIPT] Source directories verified successfully"

# Check environment variables
if [ -z "$GITWHALE_LEFT_DEST" ]; then
    echo "[DIFF-SCRIPT] ERROR: GITWHALE_LEFT_DEST environment variable not set"
    echo "ERROR: GITWHALE_LEFT_DEST environment variable not set"
    exit 1
fi
if [ -z "$GITWHALE_RIGHT_DEST" ]; then
    echo "[DIFF-SCRIPT] ERROR: GITWHALE_RIGHT_DEST environment variable not set"
    echo "ERROR: GITWHALE_RIGHT_DEST environment variable not set"
    exit 1
fi

echo "[DIFF-SCRIPT] Environment variables validated successfully"

# Ensure destination directories exist
echo "[DIFF-SCRIPT] Creating destination directories if needed"
mkdir -p "$GITWHALE_LEFT_DEST"
mkdir -p "$GITWHALE_RIGHT_DEST"

# Copy directories recursively
echo "[DIFF-SCRIPT] Starting copy operation for left directory: $1 -> $GITWHALE_LEFT_DEST"
if ! cp -r "$1/." "$GITWHALE_LEFT_DEST/" 2>/dev/null; then
    echo "[DIFF-SCRIPT] ERROR: Failed to copy left directory"
    echo "ERROR: Failed to copy left directory"
    exit 1
fi

echo "[DIFF-SCRIPT] Left directory copied successfully"

echo "[DIFF-SCRIPT] Starting copy operation for right directory: $2 -> $GITWHALE_RIGHT_DEST"
if ! cp -r "$2/." "$GITWHALE_RIGHT_DEST/" 2>/dev/null; then
    echo "[DIFF-SCRIPT] ERROR: Failed to copy right directory"
    echo "ERROR: Failed to copy right directory"
    exit 1
fi

echo "[DIFF-SCRIPT] Right directory copied successfully"
echo "[DIFF-SCRIPT] All operations completed successfully"
echo "SUCCESS: Directories copied successfully"
exit 0`
	}

	scriptPath := filepath.Join(appFolderPath, scriptName)

	// TODO: We should run this config step once in the application's life cycle, maybe on startup?
	// Check if script already exists and is up to date
	// if _, err := os.Stat(scriptPath); err == nil {
	// 	logger.Log.Debug("Helper diff script already exists: %s", scriptPath)
	// 	return scriptPath, nil
	// }

	// Create the script
	err = os.WriteFile(scriptPath, []byte(scriptContent), 0755)
	if err != nil {
		return "", fmt.Errorf("failed to write helper script: %v", err)
	}

	logger.Log.Info("Created helper diff script: %s", scriptPath)
	return scriptPath, nil
}

// Ensures git difftool is configured to use our helper script
func ensureGitDiffToolConfig(repoPath string) error {
	scriptPath, err := ensureHelperDiffScript()
	if err != nil {
		return fmt.Errorf("failed to ensure helper script: %v", err)
	}

	toolName := "gitwhale-diff-helper"
	configKey := "difftool." + toolName + ".cmd"
	configValue := scriptPath + " \"$LOCAL\" \"$REMOTE\""

	// Check if already configured correctly
	checkCmd := exec.Command("git", "config", "--global", configKey)
	checkCmd.Dir = repoPath
	if output, err := command_utils.RunCommandAndLogErr(checkCmd); err == nil {
		currentValue := strings.TrimSpace(string(output))
		if currentValue == configValue {
			logger.Log.Debug("Git difftool already configured correctly")
			return nil
		}
	}

	// Set the configuration
	configCmd := exec.Command("git", "config", "--global", configKey, configValue)
	configCmd.Dir = repoPath
	if _, err := command_utils.RunCommandAndLogErr(configCmd); err != nil {
		return fmt.Errorf("failed to configure git difftool: %v", err)
	}

	logger.Log.Info("Configured git difftool to use helper script: %s", scriptPath)
	return nil
}

// Creates a new diff session with simplified flow
func CreateDiffSession(options DiffOptions) (*DiffSession, error) {
	logger.Log.Info("Creating diff session for repo: %s, from: %s, to: %s", options.RepoPath, options.FromRef, options.ToRef)

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
	err = executeDiffScript(options.RepoPath, options.FromRef, options.ToRef, leftPath, rightPath)
	if err != nil {
		CleanupDiffSession(sessionId) // Cleanup on failure
		return nil, err
	}

	// Step 4: Create session object
	session := &DiffSession{
		SessionId:     sessionId,
		RepoPath:      options.RepoPath,
		FromRef:       options.FromRef,
		ToRef:         options.ToRef,
		LeftPath:      leftPath,
		RightPath:     rightPath,
		CreatedAt:     time.Now(),
		LastAccessed:  time.Now(),
		Title:         generateDiffTitle(options),
		DirectoryData: nil,
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

// Helper functions (unchanged)
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
