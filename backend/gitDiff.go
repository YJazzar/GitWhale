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
	err = populateDiffDirectories(session, options)

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

// Populates the temporary directories with diff content
func populateDiffDirectories(session *DiffSession, options DiffOptions) error {

	tmpLeftDir, tmpRightDir, err := getGitDifftoolPaths(session.FromRef, session.ToRef)
	if err != nil {
		return fmt.Errorf("failed to get difftool paths: %v", err)
	}

	Log.Info("Left directory (from %s): %s", session.FromRef, tmpLeftDir)
	Log.Info("Right directory (from %s): %s", session.ToRef, tmpRightDir)

	// Copy them to your desired locations
	err = copyDirectory(tmpLeftDir, session.LeftPath)
	if err != nil {
		Log.Error("Failed to copy left directory: %v", err)
		return fmt.Errorf("failed to copy left directory: %v", err)
	}

	err = copyDirectory(tmpRightDir, session.RightPath)
	if err != nil {
		Log.Error("Failed to copy right directory: %v", err)
		return fmt.Errorf("failed to copy right directory: %v", err)
	}

	Log.Info("Directories copied successfully!")

	// Now you have the paths in variables to use as needed
	// Example: copy them somewhere, process them, etc.
	Log.Info("Paths captured successfully!")
	return nil
}

func getGitDifftoolPaths(hash1, hash2 string) (leftDir, rightDir string, err error) {
	// Create a simple script that just prints the two directory paths
	scriptPath, err := createPathExtractorScript()
	if err != nil {
		return "", "", fmt.Errorf("failed to create path extractor script: %v", err)
	}
	defer os.Remove(scriptPath)

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Configure a temporary difftool and run git difftool
	tempToolName := "gitwhale-path-extractor"

	// Set up the temporary difftool configuration
	cmd := exec.CommandContext(ctx, "git", "config", "--local", "difftool."+tempToolName+".cmd", scriptPath+" \"$LOCAL\" \"$REMOTE\"")
	if err := cmd.Run(); err != nil {
		return "", "", fmt.Errorf("failed to configure temporary difftool: %v", err)
	}

	// Clean up the temporary configuration
	defer func() {
		exec.Command("git", "config", "--local", "--unset", "difftool."+tempToolName+".cmd").Run()
	}()

	// Run git difftool with our configured tool
	cmd = exec.CommandContext(ctx, "git", "difftool", "-d", "--tool="+tempToolName, "--no-prompt", hash1, hash2)

	// Capture the output which will contain our directory paths
	output, err := cmd.CombinedOutput()

	// Parse the output to extract the paths
	outputStr := strings.TrimSpace(string(output))
	lines := strings.Split(outputStr, "\n")

	// Look for our specific output lines
	for _, line := range lines {
		if strings.HasPrefix(line, "LEFT_DIR:") {
			leftDir = strings.TrimSpace(strings.TrimPrefix(line, "LEFT_DIR:"))
		} else if strings.HasPrefix(line, "RIGHT_DIR:") {
			rightDir = strings.TrimSpace(strings.TrimPrefix(line, "RIGHT_DIR:"))
		}
	}

	if leftDir == "" || rightDir == "" {
		return "", "", fmt.Errorf("failed to extract directory paths from git difftool output")
	}

	return leftDir, rightDir, nil
}

func createPathExtractorScript() (string, error) {
	var scriptExt, scriptContent string

	if runtime.GOOS == "windows" {
		scriptExt = ".bat"
		scriptContent = `@echo off
echo LEFT_DIR:%1
echo RIGHT_DIR:%2
REM Exit immediately after printing paths
exit /b 0
`
	} else {
		scriptExt = ".sh"
		scriptContent = `#!/bin/bash
echo "LEFT_DIR:$1"
echo "RIGHT_DIR:$2"
# Exit immediately after printing paths
exit 0
`
	}

	// Create temporary script file
	tempDir := os.TempDir()
	scriptPath := filepath.Join(tempDir, "git-path-extractor"+scriptExt)

	err := os.WriteFile(scriptPath, []byte(scriptContent), 0755)
	if err != nil {
		return "", fmt.Errorf("failed to write script file: %v", err)
	}

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
