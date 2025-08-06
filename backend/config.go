package backend

import (
	"gitwhale/backend/logger"
	"path/filepath"
)

type AppConfig struct {
	// The file path where the AppConfig struct lives
	FilePath string `json:"filePath"`

	// Application settings
	Settings AppSettings `json:"settings"`

	// The git repos that are currently open, and their tab orders
	GitReposMap         map[string]RepoContext `json:"openGitRepos"`
	OrderedOpenGitRepos []string               `json:"orderedOpenGitRepos"`

	// A list of all the previous repos opened by the user
	RecentGitRepos []string `json:"recentGitRepos"`

	// A list of starred repos that persist at the top
	StarredGitRepos []string `json:"starredGitRepos"`
}

type AppSettings struct {
	Git      GitSettings      `json:"git"`
	Terminal TerminalSettings `json:"terminal"`
}

type GitSettings struct {
	CommitsToLoad int `json:"commitsToLoad"`
}

type TerminalSettings struct {
	DefaultCommand string `json:"defaultCommand"`
	FontSize       int    `json:"fontSize"`
	ColorScheme    string `json:"colorScheme"`
	CursorStyle    string `json:"cursorStyle"`
}

func LoadAppConfig() (*AppConfig, error) {
	appConfigFile, err := getAppConfigFilePath()
	if err != nil {
		logger.Log.Error("Could not get config file path because: %v", err)
		return nil, err
	}

	config, err := LoadJSON[*AppConfig](appConfigFile)
	if err != nil || config == nil {
		config = &AppConfig{
			FilePath: appConfigFile,
			Settings: AppSettings{
				Git: GitSettings{
					CommitsToLoad: 100,
				},
				Terminal: TerminalSettings{
					DefaultCommand: "",
					FontSize:       14,
					ColorScheme:    "default",
					CursorStyle:    "block",
				},
			},
			GitReposMap:     make(map[string]RepoContext),
			RecentGitRepos:  []string{},
			StarredGitRepos: []string{},
		}
	}

	// Ensure settings have default values if they're missing
	if config.Settings.Git.CommitsToLoad == 0 {
		config.Settings.Git.CommitsToLoad = 100
	}
	if config.Settings.Terminal.FontSize == 0 {
		config.Settings.Terminal.FontSize = 14
	}
	if config.Settings.Terminal.ColorScheme == "" {
		config.Settings.Terminal.ColorScheme = "default"
	}
	if config.Settings.Terminal.CursorStyle == "" {
		config.Settings.Terminal.CursorStyle = "block"
	}

	return config, err
}

func (config *AppConfig) SaveAppConfig() error {
	return SaveAsJSON(config.FilePath, config)
}

// Returns the absolute path that should be used to key into the repo
func (config *AppConfig) openNewRepo(gitRepoPath string) string {
	gitRepoPath, err := filepath.Abs(gitRepoPath)
	if err != nil {
		logger.Log.Error("Failed to get the absolute path for the repo: %v", gitRepoPath)
		logger.Log.Error("Inner error message: %v", err)
		return ""
	}

	// Add to the list of open git repos if it's not already open for some reason
	logger.Log.Info("Current config: %v", config)
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

func (config *AppConfig) toggleStarRepo(gitRepoPath string) bool {
	gitRepoPath, err := filepath.Abs(gitRepoPath)
	if err != nil {
		logger.Log.Error("Failed to get the absolute path for the repo: %v", gitRepoPath)
		logger.Log.Error("Inner error message: %v", err)
		return false
	}

	starIndex := FindIndex(config.StarredGitRepos, gitRepoPath)
	if starIndex >= 0 {
		// Repo is starred, so unstar it
		config.StarredGitRepos = RemoveFromArray(config.StarredGitRepos, starIndex)
		return false
	} else {
		// Repo is not starred, so star it
		config.StarredGitRepos = append(config.StarredGitRepos, gitRepoPath)
		return true
	}
}

func (config *AppConfig) updateSettings(newSettings AppSettings) error {
	config.Settings = newSettings
	return config.SaveAppConfig()
}
