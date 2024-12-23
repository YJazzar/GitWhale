package backend

import (
	"fmt"
	"os"
	"path/filepath"
)

type AppConfig struct {
	// The file path where the AppConfig struct lives
	FilePath string `json:"filePath"`

	// The default git repo to open
	DefaultStartupRepo *string `json:"defaultStartupRepo"`

	// A list of all the previous repos opened by the user
	RecentGitRepos []*string `json:"recentGitRepos"`
}

func LoadAppConfig() (*AppConfig, error) {
	appConfigFile, err := getAppConfigFilePath()
	if err != nil {
		return nil, err
	}

	if !FileExists(appConfigFile) {
		return &AppConfig{
			FilePath:           appConfigFile,
			DefaultStartupRepo: nil,
			RecentGitRepos:     []*string{},
		}, nil
	}

	return LoadJSON[*AppConfig](appConfigFile)
}

func (config *AppConfig) SaveAppConfig() error {
	return SaveAsJSON(config.FilePath, config)
}

func getAppConfigFilePath() (string, error) {
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
	if !DirExists(appConfigFolder) {
		os.Mkdir(appConfigFolder, 0755)
	}

	appConfigFile := filepath.Join(appConfigFolder, "Config.json")
	return appConfigFile, nil
}
