package backend

import (
	"encoding/json"
	"errors"
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
	Path string
	Name string
	Size int64 // in bytes
}

func readDirDiffStructure(dirs *StartupDirectoryDiffArgs) {

	// Traverse the directory and get the structure
	rootDir, err := traverseDir(dirs.LeftFolderPath)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	println("Here's the walked directory stuffs:")
	fmt.Printf("%+v\n", rootDir)
}

// traverseDir recursively traverses a directory and builds a Directory structure
func traverseDir(root string) (*Directory, error) {
	fmt.Printf("Traversing using root: %v\n", root)

	root = filepath.Clean(root)

	rootDir := &Directory{
		Path:    root,
		Name:    filepath.Base(root),
		Files:   make([]*FileInfo, 0),
		SubDirs: make([]*Directory, 0), // Use pointers for SubDirs
	}

	dirMap := make(map[string]*Directory)
	dirMap[root] = rootDir

	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			// If there's an error accessing a file/folder, print it and skip it
			fmt.Printf("Error accessing file: %v\n", err)
			return nil // Skip the file
		}

		fmt.Printf("Walking into: %v\n", path)

		// Skip the root directory itself
		if path == root {
			return nil
		}

		// the parent directory name
		parentDir := filepath.Dir(path)

		// If it's a directory, add it to the structure
		if info.IsDir() {
			newDirectory := &Directory{
				Path:    path, // Correct: use path directly, not parentDir
				Name:    filepath.Base(path),
				Files:   make([]*FileInfo, 0),
				SubDirs: make([]*Directory, 0), // Use pointers for SubDirs
			}

			// Track the folder in the map
			dirMap[path] = newDirectory

			// Link the directory to the parent dir
			parentDirectoryNode, exists := dirMap[parentDir]
			if !exists {
				return errors.New(fmt.Sprintf("failed while trying to link the directory to its parent: %v", parentDir))
			}

			// Append pointer to the new directory
			parentDirectoryNode.SubDirs = append(parentDirectoryNode.SubDirs, newDirectory)

		} else {
			// It's a file here
			directoryNode, exists := dirMap[parentDir]
			if !exists {
				return errors.New("need to always have a dir tracked in dirMap before reading its contents")
			}

			// Append file info
			directoryNode.Files = append(directoryNode.Files, &FileInfo{
				Path: path, // Corrected path for the file
				Name: filepath.Base(path),
				Size: info.Size(),
			})
		}
		return nil
	})

	if err != nil {
		fmt.Println("error:", err)
	}

	// Debug print the final structure
	prettyPrint("Final directory structure:\n", rootDir)

	return rootDir, err
}

type EmptyInterface interface {
}

func prettyPrint(msg string, t EmptyInterface) {
	// Debug print the final structure
	b, err := json.MarshalIndent(t, "", "  ")
	if err != nil {
		fmt.Println("error:", err)
	}
	fmt.Print(msg)
	fmt.Print(string(b))
}
