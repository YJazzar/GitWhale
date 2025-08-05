package backend

import (
	"bufio"
	"context"
	"crypto/md5"
	"fmt"
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

// Cleans up git error messages for display without trying to be overly smart
func cleanGitError(stderrLines []string) string {
	if len(stderrLines) == 0 {
		return ""
	}

	// Join all stderr lines
	fullError := strings.Join(stderrLines, " ")
	fullError = strings.TrimSpace(fullError)
	
	if len(fullError) == 0 {
		return ""
	}

	// Just return the git error as-is - git's error messages are already user-friendly
	return fullError
}

// Validates that a git ref exists and is valid
func validateGitRef(repoPath, ref string) error {
	if ref == "" {
		return nil // Empty ref is valid (means working tree)
	}

	// First check if the repository is valid
	checkRepoCmd := exec.Command("git", "rev-parse", "--git-dir")
	checkRepoCmd.Dir = repoPath
	if _, err := checkRepoCmd.Output(); err != nil {
		return fmt.Errorf("not a valid git repository: %s", repoPath)
	}

	// Use git rev-parse to validate the ref
	cmd := exec.Command("git", "rev-parse", "--verify", ref+"^{commit}")
	cmd.Dir = repoPath
	output, err := cmd.CombinedOutput()
	if err != nil {
		// Show git's own error message - it's already user-friendly
		gitError := strings.TrimSpace(string(output))
		if gitError != "" {
			return fmt.Errorf("invalid git reference '%s': %s", ref, gitError)
		}
		return fmt.Errorf("invalid git reference '%s'", ref)
	}

	Log.Debug("Validated git ref '%s' in repo %s", ref, repoPath)
	return nil
}

// Basic validation to check if refs are suitable for diff operations
func validateDiffOperation(repoPath, fromRef, toRef string) error {
	// If both refs are empty, that's not valid for diff
	if fromRef == "" && toRef == "" {
		return fmt.Errorf("both references cannot be empty - at least one reference must be specified")
	}

	// Just check if repository has any commits by trying to get HEAD
	cmd := exec.Command("git", "rev-parse", "HEAD")
	cmd.Dir = repoPath
	_, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("repository has no commits yet")
	}

	return nil
}

// Creates a new diff session with managed temporary directories
func CreateDiffSession(options DiffOptions) (*DiffSession, error) {
	Log.Info("Creating diff session for repo: %s, from: %s, to: %s", options.RepoPath, options.FromRef, options.ToRef)

	// Validate git refs before proceeding
	if err := validateGitRef(options.RepoPath, options.FromRef); err != nil {
		return nil, fmt.Errorf("invalid fromRef: %v", err)
	}
	if err := validateGitRef(options.RepoPath, options.ToRef); err != nil {
		return nil, fmt.Errorf("invalid toRef: %v", err)
	}
	
	// Additional validation for diff operation
	if err := validateDiffOperation(options.RepoPath, options.FromRef, options.ToRef); err != nil {
		return nil, err
	}

	// Generate unique session ID
	sessionId := generateSessionId(options)
	Log.Debug("Created diff session ID: %s", sessionId)

	// Create temp directories for this session
	leftPath, rightPath, err := createTempDiffDirectories(sessionId)
	if err != nil {
		return nil, fmt.Errorf("failed to create temp directories: %v", err)
	}

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
		DirectoryData: nil, // Will be populated later
	}

	// Populate the directories with diff content
	err = getGitDifftoolPathsAndCopy(session)
	if err != nil {
		// Cleanup on failure
		CleanupDiffSession(sessionId)
		return nil, fmt.Errorf("failed to populate diff directories: %v", err)
	}

	// Now it should be safe to load the directory structure for the diff
	session.DirectoryData = GetDiffSessionDirectory(session)
	if session.DirectoryData == nil {
		// Cleanup on failure
		CleanupDiffSession(sessionId)
		return nil, fmt.Errorf("failed to load directory structure for diff session")
	}

	Log.Info("Created diff session: %s", sessionId)
	return session, nil
}

// Cleans up temporary directories for a diff session
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

// Gets directory structure for diff session (same format as existing dirdiff)
func GetDiffSessionDirectory(session *DiffSession) *Directory {
	Log.Info("Getting directory structure for diff session: %s", session.SessionId)

	// Update last accessed time
	session.LastAccessed = time.Now()

	return readDiffs(session)
}

// Cleans up old diff sessions (older than 24 hours)
func CleanupOldDiffSessions() error {
	tempDir := os.TempDir()
	diffDir := filepath.Join(tempDir, "gitwhale-diff")

	entries, err := os.ReadDir(diffDir)
	if err != nil {
		// Directory doesn't exist, nothing to cleanup
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

// Generates a unique session ID based on diff options
func generateSessionId(options DiffOptions) string {
	data := fmt.Sprintf("%s-%s-%s-%d", options.RepoPath, options.FromRef, options.ToRef, time.Now().UnixNano())
	hash := md5.Sum([]byte(data))
	return fmt.Sprintf("diff_%x", hash)[:16]
}

// Generates a human-readable title for the diff session
func generateDiffTitle(options DiffOptions) string {
	if options.ToRef == "" || options.ToRef == "HEAD" {
		if options.FromRef == "" || options.FromRef == "HEAD" {
			return "Working Tree vs HEAD"
		}
		return fmt.Sprintf("Working Tree vs %s", options.FromRef)
	}

	if options.FromRef == "" || options.FromRef == "HEAD" {
		return fmt.Sprintf("HEAD vs %s", options.ToRef)
	}

	return fmt.Sprintf("%s vs %s", options.FromRef, options.ToRef)
}

// Creates temporary directories for diff session
func createTempDiffDirectories(sessionId string) (leftPath, rightPath string, err error) {
	tempDir := os.TempDir()
	sessionDir := filepath.Join(tempDir, "gitwhale-diff", sessionId)

	leftPath = filepath.Join(sessionDir, "left")
	rightPath = filepath.Join(sessionDir, "right")

	// Create directories
	err = os.MkdirAll(leftPath, 0755)
	if err != nil {
		return "", "", err
	}

	err = os.MkdirAll(rightPath, 0755)
	if err != nil {
		return "", "", err
	}

	return leftPath, rightPath, nil
}

// Gets git difftool paths and copies directories while script is running
func getGitDifftoolPathsAndCopy(session *DiffSession) error {
	hash1 := session.FromRef
	hash2 := session.ToRef
	leftDestPath := session.LeftPath
	rightDestPath := session.RightPath
	repoPath := session.RepoPath

	Log.Info("Starting difftool operation for repo: %s, from: %s, to: %s", repoPath, hash1, hash2)

	// Create a simple script that prints the two directory paths and hangs
	scriptPath, err := createPathExtractorScript()
	if err != nil {
		return fmt.Errorf("failed to create path extractor script: %v", err)
	}
	defer os.Remove(scriptPath)

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Configure a temporary difftool and run git difftool
	tempToolName := "gitwhale-path-extractor"

	// Set up the temporary difftool configuration
	configValue := scriptPath + " \"$LOCAL\" \"$REMOTE\""
	configCmd := exec.CommandContext(ctx, "git", "config", "--local", "difftool."+tempToolName+".cmd", configValue)
	configCmd.Dir = repoPath // Set working directory to repo
	Log.Info("Configuring git difftool in repo: %s with command: %s", repoPath, configValue)
	
	if output, err := configCmd.CombinedOutput(); err != nil {
		Log.Error("Git config command failed. Output: %s", string(output))
		return fmt.Errorf("failed to configure temporary difftool in repo %s: %v", repoPath, err)
	}

	// Verify the configuration was set correctly
	verifyCmd := exec.CommandContext(ctx, "git", "config", "--local", "difftool."+tempToolName+".cmd")
	verifyCmd.Dir = repoPath
	if output, err := verifyCmd.Output(); err != nil {
		Log.Warning("Could not verify difftool configuration: %v", err)
	} else {
		Log.Info("Verified difftool configuration: %s", strings.TrimSpace(string(output)))
	}

	// Clean up the temporary configuration
	defer func() {
		Log.Info("Cleaning up git difftool configuration")
		cleanupCmd := exec.Command("git", "config", "--local", "--unset", "difftool."+tempToolName+".cmd")
		cleanupCmd.Dir = repoPath
		if err := cleanupCmd.Run(); err != nil {
			Log.Warning("Failed to cleanup git difftool configuration: %v", err)
		}
	}()

	// Run git difftool with our configured tool
	cmd := exec.CommandContext(ctx, "git", "difftool", "-d", "--tool="+tempToolName, "--no-prompt", hash1, hash2)
	cmd.Dir = repoPath // Set working directory to repo
	Log.Info("Running git difftool in repo: %s with refs: %s -> %s", repoPath, hash1, hash2)

	// Get both stdout and stderr pipes to monitor the process
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdout pipe: %v", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to create stderr pipe: %v", err)
	}

	// Start the process
	Log.Info("Starting git difftool process with command: %v", cmd.Args)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start git difftool: %v", err)
	}

	Log.Info("Git difftool process started with PID: %d", cmd.Process.Pid)

	// Monitor stderr in a separate goroutine and collect error messages
	var stderrOutput []string
	stderrDone := make(chan struct{})
	go func() {
		defer close(stderrDone)
		stderrScanner := bufio.NewScanner(stderr)
		for stderrScanner.Scan() {
			line := stderrScanner.Text()
			stderrOutput = append(stderrOutput, line)
			Log.Warning("Git difftool stderr: %s", line)
		}
	}()

	// Ensure we kill the process when done
	defer func() {
		if cmd.Process != nil {
			Log.Info("Terminating git difftool process (PID: %d)", cmd.Process.Pid)
			if err := cmd.Process.Kill(); err != nil {
				Log.Warning("Failed to kill git difftool process: %v", err)
			}
		}
	}()

	// Read output line by line until we get the DONE signal
	scanner := bufio.NewScanner(stdout)
	var leftDir, rightDir string
	var allOutput []string
	var scriptErrors []string
	done := false

	// Use a channel to handle timeout during scanning
	scanComplete := make(chan error, 1)

	go func() {
		defer close(scanComplete)
		lineCount := 0
		for scanner.Scan() {
			line := scanner.Text()
			lineCount++
			allOutput = append(allOutput, line)
			Log.Info("Git difftool stdout line %d: '%s'", lineCount, line)

			// Check for script error messages
			if strings.HasPrefix(line, "ERROR:") {
				errorMsg := strings.TrimSpace(strings.TrimPrefix(line, "ERROR:"))
				scriptErrors = append(scriptErrors, errorMsg)
				Log.Error("Script error detected: %s", errorMsg)
			} else if strings.HasPrefix(line, "LEFT_DIR:") {
				leftDir = strings.TrimSpace(strings.TrimPrefix(line, "LEFT_DIR:"))
				Log.Info("Extracted LEFT_DIR: %s", leftDir)
			} else if strings.HasPrefix(line, "RIGHT_DIR:") {
				rightDir = strings.TrimSpace(strings.TrimPrefix(line, "RIGHT_DIR:"))
				Log.Info("Extracted RIGHT_DIR: %s", rightDir)
			} else if strings.TrimSpace(line) == "DONE" {
				done = true
				Log.Info("Received DONE signal")
				break
			}
		}
		Log.Info("Finished reading stdout. Total lines: %d, Done: %v", lineCount, done)
		scanComplete <- scanner.Err()
	}()

	// Wait for scanning to complete or timeout
	select {
	case err := <-scanComplete:
		if err != nil {
			return fmt.Errorf("error reading script output: %v", err)
		}
	case <-ctx.Done():
		return fmt.Errorf("timeout waiting for script output: %v", ctx.Err())
	}

	if !done {
		// Wait for stderr collection to complete
		<-stderrDone
		
		Log.Error("Script did not send DONE signal. All output received:")
		for i, line := range allOutput {
			Log.Error("  Line %d: '%s'", i+1, line)
		}
		
		// Prioritize script errors first (most specific)
		if len(scriptErrors) > 0 {
			Log.Error("Script reported errors:")
			for i, err := range scriptErrors {
				Log.Error("  Script error %d: '%s'", i+1, err)
			}
			return fmt.Errorf("diff operation failed: %s", strings.Join(scriptErrors, "; "))
		}
		
		// Then check for git command errors in stderr
		if len(stderrOutput) > 0 {
			Log.Error("Git difftool stderr output:")
			for i, line := range stderrOutput {
				Log.Error("  Stderr %d: '%s'", i+1, line)
			}
			
			// Show git's own error messages - they're already user-friendly
			gitError := cleanGitError(stderrOutput)
			if gitError != "" {
				return fmt.Errorf("git difftool failed: %s", gitError)
			}
			
			// Fallback if cleaning didn't help
			return fmt.Errorf("git difftool failed: %s", strings.Join(stderrOutput, "; "))
		}
		
		// Generic fallback if no specific errors found
		return fmt.Errorf("diff operation did not complete successfully - no response from git difftool")
	}

	if leftDir == "" || rightDir == "" {
		Log.Error("Failed to extract directory paths. All output received:")
		for i, line := range allOutput {
			Log.Error("  Line %d: '%s'", i+1, line)
		}
		return fmt.Errorf("failed to extract directory paths from script output")
	}

	Log.Info("Left directory (from %s): %s", hash1, leftDir)
	Log.Info("Right directory (from %s): %s", hash2, rightDir)

	// Check if directories exist before attempting to copy
	if _, err := os.Stat(leftDir); os.IsNotExist(err) {
		Log.Error("Left directory does not exist: %s", leftDir)
		return fmt.Errorf("left directory does not exist: %s", leftDir)
	} else if err != nil {
		Log.Error("Error checking left directory: %v", err)
		return fmt.Errorf("error checking left directory: %v", err)
	}

	if _, err := os.Stat(rightDir); os.IsNotExist(err) {
		Log.Error("Right directory does not exist: %s", rightDir)
		return fmt.Errorf("right directory does not exist: %s", rightDir)
	} else if err != nil {
		Log.Error("Error checking right directory: %v", err)
		return fmt.Errorf("error checking right directory: %v", err)
	}

	// List contents of directories for debugging
	Log.Info("Listing contents of left directory: %s", leftDir)
	if entries, err := os.ReadDir(leftDir); err == nil {
		for _, entry := range entries {
			Log.Info("  - %s (dir: %v)", entry.Name(), entry.IsDir())
		}
	} else {
		Log.Warning("Could not list left directory contents: %v", err)
	}

	Log.Info("Listing contents of right directory: %s", rightDir)
	if entries, err := os.ReadDir(rightDir); err == nil {
		for _, entry := range entries {
			Log.Info("  - %s (dir: %v)", entry.Name(), entry.IsDir())
		}
	} else {
		Log.Warning("Could not list right directory contents: %v", err)
	}

	// Copy directories while the script is still running (keeping Git's temp dirs alive)
	Log.Info("Starting copy of left directory: %s -> %s", leftDir, leftDestPath)
	err = copyDirectory(leftDir, leftDestPath)
	if err != nil {
		Log.Error("Failed to copy left directory: %v", err)
		return fmt.Errorf("failed to copy left directory: %v", err)
	}

	Log.Info("Starting copy of right directory: %s -> %s", rightDir, rightDestPath)
	err = copyDirectory(rightDir, rightDestPath)
	if err != nil {
		Log.Error("Failed to copy right directory: %v", err)
		return fmt.Errorf("failed to copy right directory: %v", err)
	}

	Log.Info("Directories copied successfully!")

	// Script will be killed by defer function, allowing Git to clean up its temp directories
	return nil
}

func createPathExtractorScript() (string, error) {
	var scriptExt, scriptContent string
	
	// Create debug log file path
	debugLogPath := filepath.Join(os.TempDir(), "gitwhale-difftool-debug.log")

	if runtime.GOOS == "windows" {
		scriptExt = ".bat"
		scriptContent = fmt.Sprintf(`@echo off
echo [%%date%% %%time%%] Script called with args: %%1 %%2 >> "%s"

REM Check if both parameters are provided
if "%%1"=="" (
    echo ERROR: Git difftool did not provide left directory path
    echo [%%date%% %%time%%] ERROR: Missing left directory parameter >> "%s"
    echo DONE
    pause >nul
    exit /b 1
)

if "%%2"=="" (
    echo ERROR: Git difftool did not provide right directory path  
    echo [%%date%% %%time%%] ERROR: Missing right directory parameter >> "%s"
    echo DONE
    pause >nul
    exit /b 1
)

REM Check if directories exist
if not exist "%%1" (
    echo ERROR: Left directory does not exist: %%1
    echo [%%date%% %%time%%] ERROR: Left directory missing: %%1 >> "%s"
    echo DONE
    pause >nul
    exit /b 1
)

if not exist "%%2" (
    echo ERROR: Right directory does not exist: %%2
    echo [%%date%% %%time%%] ERROR: Right directory missing: %%2 >> "%s"
    echo DONE
    pause >nul
    exit /b 1
)

REM Success case - output directory paths
echo LEFT_DIR:%%1
echo RIGHT_DIR:%%2
echo DONE
echo [%%date%% %%time%%] Script output sent successfully, now hanging >> "%s"
REM Hang indefinitely until killed by parent process
pause >nul
`, debugLogPath, debugLogPath, debugLogPath, debugLogPath, debugLogPath, debugLogPath)
	} else {
		scriptExt = ".sh"
		scriptContent = fmt.Sprintf(`#!/bin/bash
echo "$(date): Script called with args: $1 $2" >> "%s"

# Check if both parameters are provided
if [ -z "$1" ]; then
    echo "ERROR: Git difftool did not provide left directory path"
    echo "$(date): ERROR: Missing left directory parameter" >> "%s"
    echo "DONE"
    exit 1
fi

if [ -z "$2" ]; then
    echo "ERROR: Git difftool did not provide right directory path"
    echo "$(date): ERROR: Missing right directory parameter" >> "%s"
    echo "DONE"
    exit 1
fi

# Check if directories exist
if [ ! -d "$1" ]; then
    echo "ERROR: Left directory does not exist: $1"
    echo "$(date): ERROR: Left directory missing: $1" >> "%s"
    echo "DONE"
    exit 1
fi

if [ ! -d "$2" ]; then
    echo "ERROR: Right directory does not exist: $2"
    echo "$(date): ERROR: Right directory missing: $2" >> "%s"
    echo "DONE"
    exit 1
fi

# Success case - output directory paths
echo "LEFT_DIR:$1"
echo "RIGHT_DIR:$2"
echo "DONE"
echo "$(date): Script output sent successfully, now hanging" >> "%s"
# Hang indefinitely until killed by parent process
read -r
`, debugLogPath, debugLogPath, debugLogPath, debugLogPath, debugLogPath, debugLogPath)
	}

	// Create temporary script file
	tempDir := os.TempDir()
	scriptPath := filepath.Join(tempDir, "git-path-extractor"+scriptExt)

	err := os.WriteFile(scriptPath, []byte(scriptContent), 0755)
	if err != nil {
		return "", fmt.Errorf("failed to write script file: %v", err)
	}

	Log.Info("Created path extractor script at: %s", scriptPath)
	Log.Info("Debug log will be written to: %s", debugLogPath)

	return scriptPath, nil
}

// copyDirectory recursively copies a directory from src to dst
func copyDirectory(src, dst string) error {
	// Create destination directory
	if err := os.MkdirAll(dst, 0755); err != nil {
		return fmt.Errorf("failed to create destination directory: %v", err)
	}

	var copiedFiles, skippedFiles int

	// Walk through source directory
	err := filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			// Handle missing files gracefully - Git difftool only includes changed files
			if os.IsNotExist(err) {
				skippedFiles++
				Log.Info("Skipping missing file/directory: %s", path)
				return nil // Continue walking, don't fail
			}
			// For other errors (permissions, etc.), still fail
			return fmt.Errorf("error accessing path %s: %v", path, err)
		}

		// Calculate destination path
		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return fmt.Errorf("failed to calculate relative path for %s: %v", path, err)
		}
		dstPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			// Create directory
			if err := os.MkdirAll(dstPath, info.Mode()); err != nil {
				return fmt.Errorf("failed to create directory %s: %v", dstPath, err)
			}
			Log.Info("Created directory: %s", relPath)
			return nil
		}

		// Copy file
		if err := copyFile(path, dstPath); err != nil {
			Log.Warning("Failed to copy file %s: %v", relPath, err)
			skippedFiles++
			return nil // Continue copying other files
		}
		
		copiedFiles++
		Log.Info("Copied file: %s", relPath)
		return nil
	})

	if err != nil {
		return err
	}

	Log.Info("Copy completed: %d files copied, %d files/directories skipped", copiedFiles, skippedFiles)
	
	// Validate that we copied at least some files (unless the source was empty)
	if copiedFiles == 0 && skippedFiles == 0 {
		return fmt.Errorf("no files were found to copy from %s", src)
	}

	return nil
}

// copyFile copies a single file from src to dst
func copyFile(src, dst string) error {
	// Create destination directory if it doesn't exist
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}

	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	// Copy the file contents
	_, err = destFile.ReadFrom(sourceFile)
	if err != nil {
		return err
	}

	// Copy file permissions
	sourceInfo, err := sourceFile.Stat()
	if err != nil {
		return err
	}
	return os.Chmod(dst, sourceInfo.Mode())
}
