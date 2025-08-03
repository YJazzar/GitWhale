package backend

import (
	"crypto/md5"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type DiffSession struct {
	SessionId    string    `json:"sessionId"`
	RepoPath     string    `json:"repoPath"`
	FromRef      string    `json:"fromRef"`
	ToRef        string    `json:"toRef"`
	LeftPath     string    `json:"leftPath"`
	RightPath    string    `json:"rightPath"`
	CreatedAt    time.Time `json:"createdAt"`
	LastAccessed time.Time `json:"lastAccessed"`
	Title        string    `json:"title"`
}

type DiffOptions struct {
	RepoPath    string `json:"repoPath"`
	FromRef     string `json:"fromRef"`     // Source ref (commit, branch, tag)
	ToRef       string `json:"toRef"`       // Target ref (commit, branch, tag, or empty for working tree)
	FilePaths   []string `json:"filePaths"` // Optional: specific files/dirs to diff
	ContextLines int    `json:"contextLines"` // Number of context lines for diffs
}

// Creates a new diff session with managed temporary directories
func CreateDiffSession(options DiffOptions) (*DiffSession, error) {
	Log.Info("Creating diff session for repo: %s, from: %s, to: %s", options.RepoPath, options.FromRef, options.ToRef)

	// Generate unique session ID
	sessionId := generateSessionId(options)
	
	// Create temp directories for this session
	leftPath, rightPath, err := createTempDiffDirectories(sessionId)
	if err != nil {
		return nil, fmt.Errorf("failed to create temp directories: %v", err)
	}

	session := &DiffSession{
		SessionId:    sessionId,
		RepoPath:     options.RepoPath,
		FromRef:      options.FromRef,
		ToRef:        options.ToRef,
		LeftPath:     leftPath,
		RightPath:    rightPath,
		CreatedAt:    time.Now(),
		LastAccessed: time.Now(),
		Title:        generateDiffTitle(options),
	}

	// Populate the directories with diff content
	err = populateDiffDirectories(session, options)
	if err != nil {
		// Cleanup on failure
		CleanupDiffSession(sessionId)
		return nil, fmt.Errorf("failed to populate diff directories: %v", err)
	}

	Log.Info("Created diff session: %s", sessionId)
	return session, nil
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
	// Handle different diff scenarios
	if options.ToRef == "" {
		// Comparing against working tree
		return populateWorkingTreeDiff(session, options)
	} else {
		// Comparing two refs
		return populateRefDiff(session, options)
	}
}

// Populates directories for working tree comparison
func populateWorkingTreeDiff(session *DiffSession, options DiffOptions) error {
	// Left side: specified ref
	err := populateRefContent(session.LeftPath, options.RepoPath, options.FromRef, options.FilePaths)
	if err != nil {
		return fmt.Errorf("failed to populate left side (ref %s): %v", options.FromRef, err)
	}
	
	// Right side: working tree
	err = populateWorkingTreeContent(session.RightPath, options.RepoPath, options.FilePaths)
	if err != nil {
		return fmt.Errorf("failed to populate right side (working tree): %v", err)
	}
	
	return nil
}

// Populates directories for ref-to-ref comparison
func populateRefDiff(session *DiffSession, options DiffOptions) error {
	// Left side: from ref
	err := populateRefContent(session.LeftPath, options.RepoPath, options.FromRef, options.FilePaths)
	if err != nil {
		return fmt.Errorf("failed to populate left side (ref %s): %v", options.FromRef, err)
	}
	
	// Right side: to ref
	err = populateRefContent(session.RightPath, options.RepoPath, options.ToRef, options.FilePaths)
	if err != nil {
		return fmt.Errorf("failed to populate right side (ref %s): %v", options.ToRef, err)
	}
	
	return nil
}

// Populates a directory with content from a specific git ref
func populateRefContent(targetDir, repoPath, ref string, filePaths []string) error {
	// Get list of files in the ref
	files, err := getFilesInRef(repoPath, ref, filePaths)
	if err != nil {
		return err
	}
	
	// Extract each file
	for _, file := range files {
		err = extractFileFromRef(targetDir, repoPath, ref, file)
		if err != nil {
			Log.Error("Failed to extract file %s from ref %s: %v", file, ref, err)
			// Continue with other files
		}
	}
	
	return nil
}

// Populates a directory with working tree content
func populateWorkingTreeContent(targetDir, repoPath string, filePaths []string) error {
	// If specific paths are specified, copy only those
	if len(filePaths) > 0 {
		for _, path := range filePaths {
			srcPath := filepath.Join(repoPath, path)
			dstPath := filepath.Join(targetDir, path)
			
			err := copyPath(srcPath, dstPath)
			if err != nil {
				Log.Error("Failed to copy %s: %v", path, err)
			}
		}
		return nil
	}
	
	// Otherwise, copy entire working tree (excluding .git)
	return copyWorkingTree(repoPath, targetDir)
}

// Gets list of files in a git ref
func getFilesInRef(repoPath, ref string, filePaths []string) ([]string, error) {
	var cmd *exec.Cmd
	
	if len(filePaths) > 0 {
		// List specific paths
		args := append([]string{"ls-tree", "-r", "--name-only", ref}, filePaths...)
		cmd = exec.Command("git", args...)
	} else {
		// List all files
		cmd = exec.Command("git", "ls-tree", "-r", "--name-only", ref)
	}
	
	cmd.Dir = repoPath
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to list files in ref %s: %v", ref, err)
	}
	
	files := strings.Split(strings.TrimSpace(string(output)), "\n")
	var result []string
	for _, file := range files {
		if strings.TrimSpace(file) != "" {
			result = append(result, file)
		}
	}
	
	return result, nil
}

// Extracts a single file from a git ref to target directory
func extractFileFromRef(targetDir, repoPath, ref, filePath string) error {
	// Create directory structure
	fullTargetPath := filepath.Join(targetDir, filePath)
	targetDirPath := filepath.Dir(fullTargetPath)
	
	err := os.MkdirAll(targetDirPath, 0755)
	if err != nil {
		return err
	}
	
	// Extract file content using git show
	cmd := exec.Command("git", "show", fmt.Sprintf("%s:%s", ref, filePath))
	cmd.Dir = repoPath
	
	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("failed to extract file %s from ref %s: %v", filePath, ref, err)
	}
	
	// Write to target file
	return os.WriteFile(fullTargetPath, output, 0644)
}

// Copies a path (file or directory) from source to destination
func copyPath(src, dst string) error {
	srcInfo, err := os.Stat(src)
	if err != nil {
		return err
	}
	
	if srcInfo.IsDir() {
		return copyDir(src, dst)
	} else {
		return copyFile(src, dst)
	}
}

// Copies a file from source to destination
func copyFile(src, dst string) error {
	// Create destination directory
	err := os.MkdirAll(filepath.Dir(dst), 0755)
	if err != nil {
		return err
	}
	
	// Read source file
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	
	// Write destination file
	return os.WriteFile(dst, data, 0644)
}

// Copies a directory recursively from source to destination
func copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		
		// Calculate relative path
		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		
		dstPath := filepath.Join(dst, relPath)
		
		if info.IsDir() {
			return os.MkdirAll(dstPath, info.Mode())
		} else {
			return copyFile(path, dstPath)
		}
	})
}

// Copies working tree excluding .git directory
func copyWorkingTree(repoPath, targetDir string) error {
	return filepath.Walk(repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		
		// Skip .git directory
		if info.IsDir() && info.Name() == ".git" {
			return filepath.SkipDir
		}
		
		// Skip if path is .git or inside .git
		relPath, err := filepath.Rel(repoPath, path)
		if err != nil {
			return err
		}
		
		if strings.HasPrefix(relPath, ".git") {
			return nil
		}
		
		dstPath := filepath.Join(targetDir, relPath)
		
		if info.IsDir() {
			return os.MkdirAll(dstPath, info.Mode())
		} else {
			return copyFile(path, dstPath)
		}
	})
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
	
	// Create directory diff args in the expected format
	args := &StartupDirectoryDiffArgs{
		LeftPath:  session.LeftPath,
		RightPath: session.RightPath,
		IsFileDiff: false,
		ShouldSendNotification: false,
		ShouldStartFileWatcher: false,
	}
	
	return readDiffs(args)
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