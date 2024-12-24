package backend

import (
	"encoding/json"
	"fmt"
	"os"
)

func LoadJSON[T any](filename string) (T, error) {
	var data T
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

func DirExists(dirPath string) bool {
	if stat, err := os.Stat(dirPath); err == nil && stat.IsDir() {
		return true
	}

	return false
}

func FileExists(filePath string) bool {
	if _, err := os.Stat(filePath); err == nil {
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
