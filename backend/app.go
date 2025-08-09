package backend

import (
	"context"
	"fmt"
	"gitwhale/backend/command_utils"
	"gitwhale/backend/git_operations"
	"gitwhale/backend/logger"
	"os"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx             context.Context
	IsLoading       bool          `json:"isLoading"`
	StartupState    *StartupState `json:"startupState"`
	AppConfig       *AppConfig    `json:"appConfig"`
	terminalManager command_utils.XTermSessionManager
	diffSessions    map[string]*git_operations.DiffSession
}

// NewApp creates a new App application struct
func NewApp() *App {
	app := App{}
	app.IsLoading = true
	return &app
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (app *App) Startup(ctx context.Context, startupState *StartupState) {
	logger.Log.SetContext(ctx)

	app.ctx = ctx
	app.IsLoading = false

	appConfig, err := LoadAppConfig()
	if err != nil {
		logger.Log.Error("An error occurred while reading the application's saved config: %v\n", err)
	}

	logger.Log.Trace("Running App.Startup()")

	app.StartupState = startupState
	app.AppConfig = appConfig
	app.terminalManager = command_utils.XTermSessionManager{
		Ctx:              ctx,
		Settings:         &appConfig.Settings.Terminal,
		TerminalSessions: map[string]*command_utils.TerminalSession{},
	}
	app.diffSessions = make(map[string]*git_operations.DiffSession)

	if startupState.DirectoryDiffArgs != nil {
		if startupState.DirectoryDiffArgs.ShouldStartFileWatcher {
			watcher, err := StartFileDiffWatcher(ctx)
			if err != nil {
				logger.Log.Error("Failed to start file diff watcher: %v", err)
			} else {
				startupState.fileDiffWatcher = watcher
			}
		}
	} else {
		// Ensure git difftool is configured with helper script
		logger.Log.Debug("Ensuring git difftool configuration...")
		if err := git_operations.SetupGitDirDiffHelperScript(); err != nil {
			logger.Log.Error("Failed to configure git difftool: %v", err)
		}
		logger.Log.Debug("Git difftool configuration completed successfully")
	}

	// Set up frontend log event listener
	logger.SetupFrontEndLogger(ctx)
}

// Saves the config file
func (app *App) Shutdown(ctx context.Context) {
	if app.StartupState.DirectoryDiffArgs != nil {
		if app.StartupState.DirectoryDiffArgs.ShouldStartFileWatcher {
			CloseFileDiffWatcher(app.StartupState.fileDiffWatcher)
		}
	}

	err := app.AppConfig.SaveAppConfig()
	if err != nil {
		logger.Log.Error("Failed to save application configuration: %v\n", err)
	}
}

func (a *App) GetAppState() *App {
	return a
}

// Reads any arbitrary file and provides it to the web process
func (a *App) ReadFile(filePath string) string {
	if filePath == "" {
		return ""
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Sprintf("Error: %v\n", err)
	}

	return string(data)
}

// Launches a dialog to select a folder and opens a repo in the current window
func (app *App) OpenNewRepo() string {
	newRepoPath, err := runtime.OpenDirectoryDialog(app.ctx, runtime.OpenDialogOptions{})
	if err != nil || newRepoPath == "" {
		return ""
	}

	return app.AppConfig.openNewRepo(newRepoPath)
}

func (app *App) CloseRepo(gitRepoPath string) *App {
	app.AppConfig.closeRepo(gitRepoPath)
	app.CleanupTerminalSession(gitRepoPath)
	return app
}

func (app *App) InitNewTerminalSession(repoPath string) {
	app.terminalManager.SetupXTermForNewRepo(repoPath)
}

func (app *App) OnTerminalSessionWasResized(repoPath string, newSize command_utils.TTYSize) {
	app.terminalManager.ResizeConsoleSession(repoPath, newSize)
}

func (app *App) CleanupTerminalSession(repoPath string) {
	app.terminalManager.DisposeXTermSession(repoPath)
}

func (app *App) RunGitLog(gitRepoPath string, options *git_operations.GitLogOptions) []git_operations.GitLogCommitInfo {

	if options == nil {
		options = &git_operations.GitLogOptions{}
	}

	if options.CommitsToLoad == nil || *options.CommitsToLoad == 0 {
		options.CommitsToLoad = &app.AppConfig.Settings.Git.CommitsToLoad
	}

	return git_operations.ReadGitLog(gitRepoPath, *options)
}

func (app *App) GetDetailedCommitInfo(repoPath string, commitHash string) (*git_operations.DetailedCommitInfo, error) {
	return git_operations.GetDetailedCommitInfo(repoPath, commitHash)
}

func (app *App) GetAllRefs(gitRepoPath string) []git_operations.GitRef {
	return git_operations.GetAllRefs(gitRepoPath)
}

func (app *App) GitFetch(gitRepoPath string) error {
	return git_operations.GitFetch(gitRepoPath)
}

func (app *App) ToggleStarRepo(gitRepoPath string) bool {
	return app.AppConfig.toggleStarRepo(gitRepoPath)
}

func (app *App) UpdateSettings(newSettings AppSettings) error {
	err := app.AppConfig.updateSettings(newSettings)
	if err != nil {
		app.terminalManager.Settings = &newSettings.Terminal
	}

	return err
}

func (app *App) GetDefaultShellCommand() string {
	return strings.Join(app.terminalManager.GetDefaultShellCommand(), " ")
}

// Diff session management methods

func (app *App) GetStartupDirDiffDirectory() *git_operations.Directory {
	if app == nil || app.StartupState == nil {
		return nil
	}

	diffArgs := app.StartupState.DirectoryDiffArgs
	if diffArgs == nil {
		logger.Log.Warning("Attempted to run a GetDiffSessionDirectory(), but was provided nil diffArgs")
		return nil
	}

	return git_operations.ReadDiffs(diffArgs.LeftPath, diffArgs.RightPath)
}

func (app *App) StartDiffSession(options git_operations.DiffOptions) (*git_operations.DiffSession, error) {
	logger.Log.Info("Starting diff session for repo: %s", options.RepoPath)

	session, err := git_operations.CreateDiffSession(options)
	if err != nil {
		return nil, err
	}

	// Store session in app
	app.diffSessions[session.SessionId] = session

	// Cleanup old sessions periodically
	go git_operations.CleanupOldDiffSessions()

	return session, nil
}

func (app *App) GetDiffSession(sessionId string) *git_operations.DiffSession {
	session, exists := app.diffSessions[sessionId]
	if !exists {
		return nil
	}

	// Update last accessed time
	session.LastAccessed = time.Now()
	return session
}

func (app *App) EndDiffSession(sessionId string) error {
	_, exists := app.diffSessions[sessionId]
	if !exists {
		return fmt.Errorf("diff session not found: %s", sessionId)
	}

	// Cleanup temp directories
	err := git_operations.CleanupDiffSession(sessionId)
	if err != nil {
		logger.Log.Error("Failed to cleanup diff session %s: %v", sessionId, err)
	}

	// Remove from app sessions
	delete(app.diffSessions, sessionId)

	logger.Log.Info("Ended diff session: %s", sessionId)
	return nil
}

func (app *App) ListDiffSessions() []*git_operations.DiffSession {
	sessions := make([]*git_operations.DiffSession, 0, len(app.diffSessions))
	for _, session := range app.diffSessions {
		sessions = append(sessions, session)
	}
	return sessions
}

func (app *App) GetApplicationLogHistory() []logger.LogEntry {
	return logger.Log.GetCachedLogEntries()
}

func (app *App) ClearApplicationLogHistory() {
	logger.Log.ClearLogEntries()
}
