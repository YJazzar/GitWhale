package lib

import (
	"encoding/json"
	"fmt"
	"gitwhale/backend/logger"
	"hash/fnv"
	"os"
	"unicode/utf8"
)

func LoadJSON[T any](filename string) (T, error) {
	var data T
	if !FileExists(filename) {
		return data, fmt.Errorf("file not found at: %v", filename)
	}

	fileData, err := os.ReadFile(filename)
	if err != nil {
		return data, err
	}
	return data, json.Unmarshal(fileData, &data)
}

func SaveAsJSON[T any](filePath string, data T) error {
	// Marshal the struct to JSON
	jsonData, err := json.MarshalIndent(data, "", "\t")
	if err != nil {
		return fmt.Errorf("failed to marshal data to JSON: %w", err)
	}

	// Open the file, create it if it doesn't exist, or truncate it to zero length if it does exist
	file, err := os.Create(filePath)
	if err != nil {
		return fmt.Errorf("failed to create/open file: %w", err)
	}
	defer file.Close()

	// Write the JSON data to the file
	_, err = file.Write(jsonData)
	if err != nil {
		return fmt.Errorf("failed to write JSON data to file: %w", err)
	}

	return nil
}

func ReadFileAsString(filePath string) (string, error) {
	if !FileExists(filePath) {
		return "", fmt.Errorf("file not found at: %v", filePath)
	}

	fileData, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}

	return string(fileData), nil
}

func WriteToFileAndReplaceOld(filePath string, fileContent string) error {
	content := []byte(fileContent)
	err := os.WriteFile(filePath, content, 0644) // 0644 is the file permission
	if err != nil {
		logger.Log.Error("Error writing to file: %v", err)
		return err
	}
	logger.Log.Info("File written successfully to: %v", filePath)
	return nil
}

func DeleteFile(filePath string) error {
	err := os.Remove(filePath)
	if err != nil {
		logger.Log.Error("Error removing file: %v", err)
		return err
	}

	logger.Log.Info("Deleted file successfully: %v", filePath)
	return nil
}

func CreateDirIfNeeded(path string) {
	if !DirExists(path) {
		os.Mkdir(path, 0755)
	}
}

func IsDir(path string) (bool, error) {
	stat, err := os.Stat(path)
	return stat.IsDir(), err
}

func DirExists(dirPath string) bool {
	if stat, err := os.Stat(dirPath); err == nil && stat.IsDir() {
		return true
	}

	return false
}

func FileExists(filePath string) bool {
	if stat, err := os.Stat(filePath); err == nil && !stat.IsDir() {
		return true

	}
	return false
}

func RemoveFromArray[T any](slice []T, indexToRemove int) []T {
	if indexToRemove < 0 || indexToRemove > len(slice) {
		return slice
	}

	return append(slice[:indexToRemove], slice[indexToRemove+1:]...)
}

func FindIndex[T comparable](slice []T, element T) int {
	for index, currentElement := range slice {
		if element == currentElement {
			return index
		}
	}

	return -1
}

func FilterDeletedDirs(folderPaths []string) []string {
	// Filter recent repos
	filteredDirs := make([]string, 0, len(folderPaths))
	for _, repoPath := range folderPaths {
		if DirExists(repoPath) {
			filteredDirs = append(filteredDirs, repoPath)
		}
	}
	return filteredDirs
}

func PrettyPrint(t any) string {
	// Debug print the final structure
	b, err := json.MarshalIndent(t, "", "  ")
	if err != nil {
		return fmt.Sprintf("error: %v", err)
	}

	return string(b)
}

func HashString(s string) uint32 {
	h := fnv.New32a()
	h.Write([]byte(s))
	return h.Sum32()
}

func RemoveLeadingPeriod(extension string) string {
	if len(extension) < 1 || extension[:1] != "." {
		return extension
	}

	_, i := utf8.DecodeRuneInString(extension)
	return extension[i:]

}
