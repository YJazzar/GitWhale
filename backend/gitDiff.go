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

// Creates a new diff session with managed temporary directories
func CreateDiffSession(options DiffOptions) (*DiffSession, error) {
	Log.Info("Creating diff session for repo: %s, from: %s, to: %s", options.RepoPath, options.FromRef, options.ToRef)

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

	// Now it should be safe to load the directory structure for the diff
	session.DirectoryData = GetDiffSessionDirectory(session)

	if err != nil {
		// Cleanup on failure
		CleanupDiffSession(sessionId)
		return nil, fmt.Errorf("failed to populate diff directories: %v", err)
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

	// Monitor stderr in a separate goroutine
	go func() {
		stderrScanner := bufio.NewScanner(stderr)
		for stderrScanner.Scan() {
			Log.Warning("Git difftool stderr: %s", stderrScanner.Text())
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

			if strings.HasPrefix(line, "LEFT_DIR:") {
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
		Log.Error("Script did not send DONE signal. All output received:")
		for i, line := range allOutput {
			Log.Error("  Line %d: '%s'", i+1, line)
		}
		return fmt.Errorf("script did not complete successfully - DONE signal not received")
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
echo LEFT_DIR:%%1
echo RIGHT_DIR:%%2
echo DONE
echo [%%date%% %%time%%] Script output sent, now hanging >> "%s"
REM Hang indefinitely until killed by parent process
pause >nul
`, debugLogPath, debugLogPath)
	} else {
		scriptExt = ".sh"
		scriptContent = fmt.Sprintf(`#!/bin/bash
echo "$(date): Script called with args: $1 $2" >> "%s"
echo "LEFT_DIR:$1"
echo "RIGHT_DIR:$2"
echo "DONE"
echo "$(date): Script output sent, now hanging" >> "%s"
# Hang indefinitely until killed by parent process
read -r
`, debugLogPath, debugLogPath)
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

	// Walk through source directory
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Calculate destination path
		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		dstPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			// Create directory
			return os.MkdirAll(dstPath, info.Mode())
		}

		// Copy file
		return copyFile(path, dstPath)
	})
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
