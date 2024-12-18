package backend

import (
	"encoding/json"
	"fmt"
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
	Path       string
	Name       string
	InLeftDir  bool
	InRightDir bool
}

func readDirDiffStructure(dirs *StartupDirectoryDiffArgs) *Directory {
	rootDir := &Directory{
		Path:    "",
		Name:    "",
		Files:   make([]*FileInfo, 0),
		SubDirs: make([]*Directory, 0), // Use pointers for SubDirs
	}

	// Traverse the directory and get the structure
	if err := traverseDir(rootDir, filepath.Clean(dirs.LeftFolderPath), InLeftDir); err != nil {
		fmt.Println("Error:", err)
		return nil
	}

	if err := traverseDir(rootDir, filepath.Clean(dirs.RightFolderPath), InRightDir); err != nil {
		fmt.Println("Error:", err)
		return nil
	}

	println("Here's the walked directory stuffs:")
	fmt.Printf("%+v\n", rootDir)
	return rootDir
}

const (
	InLeftDir = iota
	InRightDir
)

// traverseDir recursively traverses a directory and builds a Directory structure
func traverseDir(rootDir *Directory, rootPath string, dirSide int) error {
	if dirSide != InLeftDir && dirSide != InRightDir {
		return fmt.Errorf("passed an invalid directory side")
	}

	fmt.Printf("Traversing using root: %v\n", rootPath)

	dirMap := make(map[string]*Directory)
	dirMap["."] = rootDir

	err := filepath.Walk(rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			// If there's an error accessing a file/folder, print it and skip it
			fmt.Printf("Error accessing file: %v\n", err)
			return nil // Skip the file
		}

		fmt.Printf("Walking into: %v\n", path)

		// Skip the root directory itself
		if path == rootPath {
			return nil
		}

		// the relative parent directory name
		relativeParentDir, err := filepath.Rel(rootPath, filepath.Dir(path))
		if err != nil {
			fmt.Printf("Error getting relative path for: %v\n", path)
			return nil
		}

		relativeDir, err := filepath.Rel(rootPath, path)
		if err != nil {
			fmt.Printf("Error getting relative path for: %v\n", path)
			return nil
		}

		// If it's a directory, add it to the structure
		if info.IsDir() {
			newDirectory := &Directory{
				Path:    relativeDir, // Correct: use path directly, not parentDir
				Name:    filepath.Base(path),
				Files:   make([]*FileInfo, 0),
				SubDirs: make([]*Directory, 0), // Use pointers for SubDirs
			}

			// Track the folder in the map
			dirMap[relativeDir] = newDirectory

			// Link the directory to the parent dir
			parentDirectoryNode, exists := dirMap[relativeParentDir]
			if !exists {
				return fmt.Errorf("failed while trying to link the directory to its parent: %v", relativeParentDir)
			}

			// Append pointer to the new directory
			parentDirectoryNode.SubDirs = append(parentDirectoryNode.SubDirs, newDirectory)
			return nil
		}

		// It's a file here
		directoryNode, exists := dirMap[relativeParentDir]
		if !exists {
			prettyPrint("current map state:", dirMap)
			return fmt.Errorf("need to always have a dir tracked in dirMap before reading its contents: %v", relativeParentDir)
		}

		// First, we check if it already exists in the map (could have been added from a previous walk)
		fileNode, exists := findFile(directoryNode.Files, path)

		if !exists {
			fileNode = &FileInfo{
				Path: relativeDir, // Corrected path for the file
				Name: filepath.Base(path),
			}

			// Append file info
			directoryNode.Files = append(directoryNode.Files, fileNode)
		}

		if dirSide == InLeftDir {
			fileNode.InLeftDir = true
		} else if dirSide == InRightDir {
			fileNode.InRightDir = true
		}

		return nil
	})

	if err != nil {
		fmt.Println("error:", err)
	}

	// Debug print the final structure
	prettyPrint("Final directory structure:\n", rootDir)

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

func prettyPrint(msg string, t any) {
	// Debug print the final structure
	b, err := json.MarshalIndent(t, "", "  ")
	if err != nil {
		fmt.Println("error:", err)
	}
	fmt.Print(msg)
	fmt.Print(string(b))
}
