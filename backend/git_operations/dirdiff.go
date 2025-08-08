package git_operations

import (
	"fmt"
	"gitwhale/backend/lib"
	"gitwhale/backend/logger"
	"os"
	"path/filepath"
)

// Directory represents a folder and its contents (both files and subdirectories).
type Directory struct {
	Path    string
	Name    string
	Files   []*FileInfo  // Files inside this directory
	SubDirs []*Directory // Subdirectories inside this directory
}

// FileInfo holds information about a file.
type FileInfo struct {
	Path            string
	Name            string
	Extension       string
	LeftDirAbsPath  string
	RightDirAbsPath string
}

// Given a left side and a right side path (dir or filepath), the tag will figure out all the files
// we need to show diffs for (only runs if the program was opened with the --diff-tool flag)
func ReadDiffs(leftPath, rightPath string) *Directory {

	if leftPath == "" || rightPath == "" {
		return nil
	}

	leftIsDir, leftErr := lib.IsDir(leftPath)
	rightIsDir, rightErr := lib.IsDir(rightPath)
	if leftErr != nil || rightErr != nil {
		logger.Log.Error("Got errors checking if the passed paths were directories or files.")
		logger.Log.Error("\tLeft path error: %v", leftErr)
		logger.Log.Error("\tRight path error: %v", rightErr)
		return nil
	}

	if leftIsDir != rightIsDir {
		logger.Log.Error("The left path and the right input paths must match")
		logger.Log.Error("\tLeft path: %v", leftPath)
		logger.Log.Error("\tRight path: %v", rightPath)
		return nil
	}

	if leftIsDir {
		return readDirDiffStructure(leftPath, rightPath)
	}

	return readFileDiff(leftPath, rightPath)
}

func readFileDiff(leftPath, rightPath string) *Directory {

	leftAbsPath, err := filepath.Abs(leftPath)
	if err != nil {
		logger.Log.Error("Could not translate the left input path to an absolute path. Error: %v", err)
		return nil
	}

	rightAbsPath, err := filepath.Abs(rightPath)
	if err != nil {
		logger.Log.Error("Could not translate the right input path to an absolute path. Error: %v", err)
		return nil
	}

	rootDir := &Directory{
		Path:    "./",
		Name:    "./",
		Files:   make([]*FileInfo, 0),
		SubDirs: make([]*Directory, 0), // Use pointers for SubDirs
	}

	fileNode := &FileInfo{
		Path:            "",
		Name:            filepath.Base(leftPath),
		Extension:       lib.RemoveLeadingPeriod(filepath.Ext(leftPath)),
		LeftDirAbsPath:  leftAbsPath,
		RightDirAbsPath: rightAbsPath,
	}

	// Append file info
	rootDir.Files = append(rootDir.Files, fileNode)

	return rootDir
}

func readDirDiffStructure(leftPath, rightPath string) *Directory {
	rootDir := &Directory{
		Path:    "./",
		Name:    "./",
		Files:   make([]*FileInfo, 0),
		SubDirs: make([]*Directory, 0), // Use pointers for SubDirs
	}

	// Set up a cache for all the folders and files
	dirMap := make(map[string]*Directory)
	dirMap["."] = rootDir

	// Traverse the directory and get the structure
	if err := traverseDir(filepath.Clean(leftPath), InLeftDir, dirMap); err != nil {
		logger.Log.Error("Error: %v", err)
		return nil
	}

	if err := traverseDir(filepath.Clean(rightPath), InRightDir, dirMap); err != nil {
		logger.Log.Error("Error: %v", err)
		return nil
	}

	return rootDir
}

const (
	InLeftDir = iota
	InRightDir
)

// traverseDir recursively traverses a directory and builds a Directory structure
func traverseDir(
	rootPath string,
	dirSide int,
	cachedDirMap map[string]*Directory,
) error {
	if dirSide != InLeftDir && dirSide != InRightDir {
		return fmt.Errorf("passed an invalid directory side")
	}

	logger.Log.Trace("Traversing using root: %v\n", rootPath)

	err := filepath.Walk(rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			// If there's an error accessing a file/folder, print it and skip it
			logger.Log.Error("filepath: \"%v\"", path)
			logger.Log.Error("File info before error: %v", info)
			logger.Log.Error("Error accessing file: %v", err)
			return nil // Skip the file
		}

		logger.Log.Trace("Walking into: %v", path)

		// Skip the root directory itself
		if path == rootPath {
			return nil
		}

		// the relative parent directory name
		relativeParentDir, err := filepath.Rel(rootPath, filepath.Dir(path))
		if err != nil {
			logger.Log.Error("Error getting relative path for: %v", path)
			return nil
		}

		relativeDir, err := filepath.Rel(rootPath, path)
		if err != nil {
			logger.Log.Error("Error getting relative path for: %v", path)
			return nil
		}
		// logger.Log.Debug("Using key in map: %v\n", relativeDir)

		absoluteFilePath, err := filepath.Abs(path)
		if err != nil {
			logger.Log.Error("Error getting absolute path for: %v", path)
			return nil
		}

		// If it's a directory, add it to the structure
		if info.IsDir() {
			// Check if we're already tracking the folder
			if _, exists := cachedDirMap[relativeDir]; exists {
				return nil
			}

			newDirectory := &Directory{
				Path:    relativeDir, // Correct: use path directly, not parentDir
				Name:    filepath.Base(path),
				Files:   make([]*FileInfo, 0),
				SubDirs: make([]*Directory, 0), // Use pointers for SubDirs
			}

			// Track the folder in the map
			cachedDirMap[relativeDir] = newDirectory

			// Link the directory to the parent dir
			parentDirectoryNode, exists := cachedDirMap[relativeParentDir]
			if !exists {
				return fmt.Errorf("failed while trying to link the directory to its parent: %v", relativeParentDir)
			}

			// Append pointer to the new directory
			parentDirectoryNode.SubDirs = append(parentDirectoryNode.SubDirs, newDirectory)
			return nil
		}

		// It's a file here
		directoryNode, exists := cachedDirMap[relativeParentDir]
		if !exists {
			logger.Log.Debug("current map state: %v", lib.PrettyPrint(cachedDirMap))
			return fmt.Errorf("need to always have a dir tracked in dirMap before reading its contents: %v", relativeParentDir)
		}

		// First, we check if it already exists in the map (could have been added from a previous walk)
		fileNode, exists := findFile(directoryNode.Files, relativeDir)

		if !exists {
			fileNode = &FileInfo{
				Path:      relativeDir, // Corrected path for the file
				Name:      filepath.Base(path),
				Extension: lib.RemoveLeadingPeriod(filepath.Ext(path)),
			}

			// Append file info
			directoryNode.Files = append(directoryNode.Files, fileNode)
		}

		if dirSide == InLeftDir {
			fileNode.LeftDirAbsPath = absoluteFilePath
		} else if dirSide == InRightDir {
			fileNode.RightDirAbsPath = absoluteFilePath
		}

		return nil
	})

	if err != nil {
		logger.Log.Error("error: %v", err)
	}

	return err
}

func findFile(files []*FileInfo, targetPath string) (*FileInfo, bool) {
	for _, file := range files {
		if file.Path == targetPath {
			return file, true
		}
	}

	return nil, false // Element not found
}
