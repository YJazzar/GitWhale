package backend

import (
	"fmt"
	"os"
	"path/filepath"
)

type AppConfig struct {
	// The file path where the AppConfig struct lives
	FilePath string `json:"filePath"`

	// The git repos that are currently open, and their tab orders
	GitReposMap         map[string]RepoContext `json:"openGitRepos"`
	OrderedOpenGitRepos []string               `json:"orderedOpenGitRepos"`

	// A list of all the previous repos opened by the user
	RecentGitRepos []string `json:"recentGitRepos"`
}

func LoadAppConfig() (*AppConfig, error) {
	appConfigFile, err := getAppConfigFilePath()
	if err != nil {
		Log.Error("Could not get config file path because: %v", err)
		return nil, err
	}

	config, err := LoadJSON[*AppConfig](appConfigFile)
	if err != nil || config == nil {
		config = &AppConfig{
			FilePath:       appConfigFile,
			GitReposMap:    make(map[string]RepoContext),
			RecentGitRepos: []string{},
		}
	}

	return config, err
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

// Returns the absolute path that should be used to key into the repo
func (config *AppConfig) openNewRepo(gitRepoPath string) string {
	gitRepoPath, err := filepath.Abs(gitRepoPath)
	if err != nil {
		Log.Error("Failed to get the absolute path for the repo: %v", gitRepoPath)
		Log.Error("Inner error message: %v", err)
		return ""
	}

	// Add to the list of open git repos if it's not already open for some reason
	Log.Info("Current config: %v", config)
	if _, exists := config.GitReposMap[gitRepoPath]; !exists {
		config.GitReposMap[gitRepoPath] = *CreateContext(gitRepoPath)
		config.OrderedOpenGitRepos = append(config.OrderedOpenGitRepos, gitRepoPath)
	}

	config.addRepoToRecentList(gitRepoPath)
	return gitRepoPath
}

func (config *AppConfig) addRepoToRecentList(gitRepoPath string) {
	// Swaps out the repo to the top of the list. That way more recent ones are surfaced
	prevIndex := FindIndex(config.RecentGitRepos, gitRepoPath)
	config.RecentGitRepos = RemoveFromArray(config.RecentGitRepos, prevIndex)
	config.RecentGitRepos = append([]string{gitRepoPath}, config.RecentGitRepos...)
}

func (config *AppConfig) closeRepo(gitRepoPath string) {
	// Remove the from map
	delete(config.GitReposMap, gitRepoPath)

	// Remove from the ordered list
	repoPositionIndex := FindIndex(config.OrderedOpenGitRepos, gitRepoPath)
	config.OrderedOpenGitRepos = RemoveFromArray(config.OrderedOpenGitRepos, repoPositionIndex)
}
