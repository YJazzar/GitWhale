package backend

import (
	"gitwhale/backend/command_utils"
	"gitwhale/backend/lib"
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
	Git           GitSettings                    `json:"git"`
	Terminal      command_utils.TerminalSettings `json:"terminal"`
	UI            UISettings                     `json:"ui"`
	CustomCommands []UserDefinedCommandDefinition `json:"customCommands"`
}

type UISettings struct {
	AutoShowCommitDetails bool `json:"autoShowCommitDetails"`
}

type GitSettings struct {
	CommitsToLoad int `json:"commitsToLoad"`
}

type UserDefinedCommandDefinition struct {
	ID          string                    `json:"id"`
	Title       string                    `json:"title"`
	Description *string                   `json:"description,omitempty"`
	Keywords    []string                  `json:"keywords,omitempty"`
	Context     string                    `json:"context"`
	Parameters  []UserDefinedParameter    `json:"parameters,omitempty"`
	Action      UserDefinedCommandAction  `json:"action"`
}

type UserDefinedParameter struct {
	ID               string   `json:"id"`
	Type             string   `json:"type"` // "string" or "select"
	Prompt           string   `json:"prompt"`
	Description      *string  `json:"description,omitempty"`
	Placeholder      *string  `json:"placeholder,omitempty"`
	Required         *bool    `json:"required,omitempty"`
	AllowCustomInput *bool    `json:"allowCustomInput,omitempty"` // for select type
	Options          []string `json:"options,omitempty"`          // for select type
}

type UserDefinedCommandAction struct {
	CommandString string `json:"commandString"`
}

func LoadAppConfig() (*AppConfig, error) {
	appConfigFile, err := lib.GetAppConfigFilePath()
	if err != nil {
		logger.Log.Error("Could not get config file path because: %v", err)
		return nil, err
	}

	config, err := lib.LoadJSON[*AppConfig](appConfigFile)
	if err != nil || config == nil {
		config = &AppConfig{
			FilePath: appConfigFile,
			Settings: AppSettings{
				Git: GitSettings{
					CommitsToLoad: 25,
				},
				Terminal: command_utils.TerminalSettings{
					DefaultCommand: "",
					FontSize:       14,
					ColorScheme:    "default",
					CursorStyle:    "block",
				},
				UI: UISettings{
					AutoShowCommitDetails: true, // Default to true for existing behavior
				},
				CustomCommands: []UserDefinedCommandDefinition{},
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
	if config.Settings.CustomCommands == nil {
		config.Settings.CustomCommands = []UserDefinedCommandDefinition{}
	}

	return config, err
}

func (config *AppConfig) SaveAppConfig() error {
	return lib.SaveAsJSON(config.FilePath, config)
}

// Returns the absolute path that should be used to key into the repo
func (config *AppConfig) openNewRepo(gitRepoPath string) {
	gitRepoPath, err := filepath.Abs(gitRepoPath)
	if err != nil {
		logger.Log.Error("Failed to get the absolute path for the repo: %v", gitRepoPath)
		logger.Log.Error("Inner error message: %v", err)
		return
	}

	// Add to the list of open git repos if it's not already open for some reason
	logger.Log.Info("Current config: %v", config)
	if _, exists := config.GitReposMap[gitRepoPath]; !exists {
		config.GitReposMap[gitRepoPath] = *CreateContext(gitRepoPath)
		config.OrderedOpenGitRepos = append(config.OrderedOpenGitRepos, gitRepoPath)
	}

	config.addRepoToRecentList(gitRepoPath)
	config.SaveAppConfig()
	return
}

func (config *AppConfig) addRepoToRecentList(gitRepoPath string) {
	// Swaps out the repo to the top of the list. That way more recent ones are surfaced
	prevIndex := lib.FindIndex(config.RecentGitRepos, gitRepoPath)
	config.RecentGitRepos = lib.RemoveFromArray(config.RecentGitRepos, prevIndex)
	config.RecentGitRepos = append([]string{gitRepoPath}, config.RecentGitRepos...)
}

func (config *AppConfig) closeRepo(gitRepoPath string) {
	// Remove the from map
	delete(config.GitReposMap, gitRepoPath)

	// Remove from the ordered list
	repoPositionIndex := lib.FindIndex(config.OrderedOpenGitRepos, gitRepoPath)
	config.OrderedOpenGitRepos = lib.RemoveFromArray(config.OrderedOpenGitRepos, repoPositionIndex)
}

func (config *AppConfig) toggleStarRepo(gitRepoPath string) bool {
	gitRepoPath, err := filepath.Abs(gitRepoPath)
	if err != nil {
		logger.Log.Error("Failed to get the absolute path for the repo: %v", gitRepoPath)
		logger.Log.Error("Inner error message: %v", err)
		return false
	}

	starIndex := lib.FindIndex(config.StarredGitRepos, gitRepoPath)
	if starIndex >= 0 {
		// Repo is starred, so unstar it
		config.StarredGitRepos = lib.RemoveFromArray(config.StarredGitRepos, starIndex)
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
