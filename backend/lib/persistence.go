package lib

import (
	"fmt"
	"os"
	"path/filepath"
)

var APP_NAME = "GitWhale"

func GetAppConfigFilePath() (string, error) {
	appConfigFolder, err := GetAppFolderPath()
	if err != nil {
		return appConfigFolder, err
	}

	appConfigFile := filepath.Join(appConfigFolder, "Config.json")
	return appConfigFile, nil
}

func GetFileDiffNotificationsFolderPath() (string, error) {
	notifFolderPath, err := GetAppFolderPath()
	if err != nil {
		return notifFolderPath, err
	}

	notifFolderPath = filepath.Join(notifFolderPath, "FileDiffs")
	CreateDirIfNeeded(notifFolderPath)
	return notifFolderPath, nil
}

func GetFileDiffNotificationLockFilePath() (string, error) {
	fileDiffsFolder, err := GetFileDiffNotificationsFolderPath()
	if err != nil {
		return fileDiffsFolder, err
	}

	lockFile := filepath.Join(fileDiffsFolder, "running.lock")
	return lockFile, nil
}

func IsFileDiffNotificationLockFileExists() (bool, error) {
	lockFilePath, err := GetFileDiffNotificationLockFilePath()
	if err != nil {
		return false, err
	}

	return FileExists(lockFilePath), nil
}

// Returns the ~/Documents/GitWhale/ directory path
func GetAppFolderPath() (string, error) {
	homePath, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	documents := filepath.Join(homePath, "Documents")
	if !DirExists(documents) {
		return "", fmt.Errorf("the documents path doesn't exist in: %v", documents)
	}

	// Check if we've already created our app's folder
	appConfigFolder := filepath.Join(documents, APP_NAME)
	CreateDirIfNeeded(appConfigFolder)

	return appConfigFolder, nil
}
