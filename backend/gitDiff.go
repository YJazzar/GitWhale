package backend

import (
	"context"
	"crypto/md5"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
	"os/user"
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
	if _, err := cmd.Output(); err != nil {
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
	output, err := cmd.CombinedOutput()
	if err != nil {
		gitError := strings.TrimSpace(string(output))
		if gitError != "" {
			return fmt.Errorf("invalid git reference '%s': %s", ref, gitError)
		}
		return fmt.Errorf("invalid git reference '%s'", ref)
	}
	
	Log.Debug("Validated git ref '%s' in repo %s", ref, repoPath)
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

// Executes the diff script using persistent script and environment variables
func executeDiffScript(repoPath, fromRef, toRef, leftDest, rightDest string) error {
	Log.Info("Starting diff operation for repo: %s, from: %s, to: %s", repoPath, fromRef, toRef)

	// Ensure git difftool is configured with persistent script
	if err := ensureGitDiffToolConfig(repoPath); err != nil {
		return fmt.Errorf("failed to configure git difftool: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Build git difftool command
	toolName := "gitwhale-persistent"
	var cmdArgs []string
	if toRef == "" {
		cmdArgs = []string{"difftool", "-d", "--tool=" + toolName, "--no-prompt", fromRef}
		Log.Info("Running git difftool: %s -> working tree", fromRef)
	} else {
		cmdArgs = []string{"difftool", "-d", "--tool=" + toolName, "--no-prompt", fromRef, toRef}
		Log.Info("Running git difftool: %s -> %s", fromRef, toRef)
	}

	// Execute git difftool with environment variables
	cmd := exec.CommandContext(ctx, "git", cmdArgs...)
	cmd.Dir = repoPath
	
	// Set environment variables for the script
	cmd.Env = append(os.Environ(),
		"GITWHALE_LEFT_DEST="+leftDest,
		"GITWHALE_RIGHT_DEST="+rightDest,
	)
	
	output, err := cmd.CombinedOutput()
	outputStr := strings.TrimSpace(string(output))
	
	if err != nil {
		// Check if it's a git error
		if strings.Contains(outputStr, "fatal:") || strings.Contains(outputStr, "error:") {
			return fmt.Errorf("git difftool failed: %s", outputStr)
		}
		return fmt.Errorf("diff operation failed: %v", err)
	}

	// Check script output for success/failure
	if strings.Contains(outputStr, "ERROR:") {
		// Extract error message
		lines := strings.Split(outputStr, "\n")
		for _, line := range lines {
			if strings.HasPrefix(line, "ERROR:") {
				return fmt.Errorf("diff script failed: %s", strings.TrimPrefix(line, "ERROR:"))
			}
		}
		return fmt.Errorf("diff script failed with unknown error")
	}

	if !strings.Contains(outputStr, "SUCCESS") {
		return fmt.Errorf("diff script did not report success: %s", outputStr)
	}

	Log.Info("Diff operation completed successfully")
	return nil
}

// Gets or creates the GitWhale app home directory
func getAppHomeDir() (string, error) {
	usr, err := user.Current()
	if err != nil {
		return "", fmt.Errorf("failed to get current user: %v", err)
	}
	
	appHomeDir := filepath.Join(usr.HomeDir, ".gitwhale")
	
	// Create directory if it doesn't exist
	if err := os.MkdirAll(appHomeDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create app home directory: %v", err)
	}
	
	return appHomeDir, nil
}

// Ensures the persistent diff script exists and returns its path
func ensurePersistentDiffScript() (string, error) {
	appHomeDir, err := getAppHomeDir()
	if err != nil {
		return "", err
	}
	
	var scriptName, scriptContent string
	if runtime.GOOS == "windows" {
		scriptName = "gitwhale-diff.bat"
		scriptContent = `@echo off
setlocal enabledelayedexpansion

REM Check if both parameters are provided
if "%1"=="" (
    echo ERROR: Git difftool did not provide left directory path
    exit /b 1
)
if "%2"=="" (
    echo ERROR: Git difftool did not provide right directory path
    exit /b 1
)

REM Check if directories exist
if not exist "%1" (
    echo ERROR: Left directory does not exist: %1
    exit /b 1
)
if not exist "%2" (
    echo ERROR: Right directory does not exist: %2
    exit /b 1
)

REM Check environment variables
if "%GITWHALE_LEFT_DEST%"=="" (
    echo ERROR: GITWHALE_LEFT_DEST environment variable not set
    exit /b 1
)
if "%GITWHALE_RIGHT_DEST%"=="" (
    echo ERROR: GITWHALE_RIGHT_DEST environment variable not set
    exit /b 1
)

REM Copy directories using robocopy
robocopy "%1" "%GITWHALE_LEFT_DEST%" /E /NFL /NDL /NJH /NJS /NC /NS /NP > nul
if errorlevel 8 (
    echo ERROR: Failed to copy left directory
    exit /b 1
)

robocopy "%2" "%GITWHALE_RIGHT_DEST%" /E /NFL /NDL /NJH /NJS /NC /NS /NP > nul
if errorlevel 8 (
    echo ERROR: Failed to copy right directory
    exit /b 1
)

echo SUCCESS: Directories copied successfully
exit /b 0`
	} else {
		scriptName = "gitwhale-diff.sh"
		scriptContent = `#!/bin/bash
set -e

# Check if both parameters are provided
if [ -z "$1" ]; then
    echo "ERROR: Git difftool did not provide left directory path"
    exit 1
fi
if [ -z "$2" ]; then
    echo "ERROR: Git difftool did not provide right directory path"
    exit 1
fi

# Check if directories exist
if [ ! -d "$1" ]; then
    echo "ERROR: Left directory does not exist: $1"
    exit 1
fi
if [ ! -d "$2" ]; then
    echo "ERROR: Right directory does not exist: $2"
    exit 1
fi

# Check environment variables
if [ -z "$GITWHALE_LEFT_DEST" ]; then
    echo "ERROR: GITWHALE_LEFT_DEST environment variable not set"
    exit 1
fi
if [ -z "$GITWHALE_RIGHT_DEST" ]; then
    echo "ERROR: GITWHALE_RIGHT_DEST environment variable not set"
    exit 1
fi

# Copy directories recursively
if ! cp -r "$1/." "$GITWHALE_LEFT_DEST/" 2>/dev/null; then
    echo "ERROR: Failed to copy left directory"
    exit 1
fi

if ! cp -r "$2/." "$GITWHALE_RIGHT_DEST/" 2>/dev/null; then
    echo "ERROR: Failed to copy right directory"
    exit 1
fi

echo "SUCCESS: Directories copied successfully"
exit 0`
	}
	
	scriptPath := filepath.Join(appHomeDir, scriptName)
	
	// Check if script already exists and is up to date
	if _, err := os.Stat(scriptPath); err == nil {
		Log.Debug("Persistent diff script already exists: %s", scriptPath)
		return scriptPath, nil
	}
	
	// Create the script
	err = os.WriteFile(scriptPath, []byte(scriptContent), 0755)
	if err != nil {
		return "", fmt.Errorf("failed to write persistent script: %v", err)
	}
	
	Log.Info("Created persistent diff script: %s", scriptPath)
	return scriptPath, nil
}

// Ensures git difftool is configured to use our persistent script
func ensureGitDiffToolConfig(repoPath string) error {
	scriptPath, err := ensurePersistentDiffScript()
	if err != nil {
		return fmt.Errorf("failed to ensure persistent script: %v", err)
	}
	
	toolName := "gitwhale-persistent"
	configKey := "difftool." + toolName + ".cmd"
	configValue := scriptPath + " \"$LOCAL\" \"$REMOTE\""
	
	// Check if already configured correctly
	checkCmd := exec.Command("git", "config", "--local", configKey)
	checkCmd.Dir = repoPath
	if output, err := checkCmd.Output(); err == nil {
		currentValue := strings.TrimSpace(string(output))
		if currentValue == configValue {
			Log.Debug("Git difftool already configured correctly")
			return nil
		}
	}
	
	// Set the configuration
	configCmd := exec.Command("git", "config", "--local", configKey, configValue)
	configCmd.Dir = repoPath
	if err := configCmd.Run(); err != nil {
		return fmt.Errorf("failed to configure git difftool: %v", err)
	}
	
	Log.Info("Configured git difftool to use persistent script: %s", scriptPath)
	return nil
}


// Creates a new diff session with simplified flow
func CreateDiffSession(options DiffOptions) (*DiffSession, error) {
	Log.Info("Creating diff session for repo: %s, from: %s, to: %s", options.RepoPath, options.FromRef, options.ToRef)

	// Step 1: Validate all inputs
	if err := validateDiffInputs(options); err != nil {
		return nil, err
	}

	// Step 2: Generate session ID and create destinations
	sessionId := generateSessionId(options)
	Log.Debug("Created diff session ID: %s", sessionId)

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

	Log.Info("Created diff session: %s", sessionId)
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

	Log.Info("Cleaning up diff session: %s", sessionId)
	err := os.RemoveAll(sessionDir)
	if err != nil {
		Log.Error("Failed to cleanup diff session %s: %v", sessionId, err)
		return err
	}
	return nil
}

func GetDiffSessionDirectory(session *DiffSession) *Directory {
	Log.Info("Getting directory structure for diff session: %s", session.SessionId)
	session.LastAccessed = time.Now()
	return readDiffs(session)
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
			Log.Info("Cleaning up old diff session: %s", entry.Name())
			os.RemoveAll(sessionPath)
		}
	}

	return nil
}