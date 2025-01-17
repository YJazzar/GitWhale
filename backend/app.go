package backend

import (
	"context"
	"fmt"
	"os"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var APP_NAME = "GitWhale"

// App struct
type App struct {
	ctx              context.Context
	IsLoading        bool          `json:"isLoading"`
	StartupState     *StartupState `json:"startupState"`
	AppConfig        *AppConfig    `json:"appConfig"`
	terminalSessions map[string]*TerminalSession
}

type TerminalSession struct {
	ptySession *os.File
	waiter     sync.WaitGroup
}

// NewApp creates a new App application struct
func NewApp() *App {
	app := App{}
	app.IsLoading = true
	return &app
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (app *App) Startup(ctx context.Context) {
	Log.setContext(ctx)

	app.ctx = ctx
	app.IsLoading = false

	appConfig, err := LoadAppConfig()
	if err != nil {
		Log.Error("An error occurred while reading the application's saved config: %v\n", err)
	}

	Log.Trace("Running App.Startup()")

	app.StartupState = getStartupState()
	app.AppConfig = appConfig
	app.terminalSessions = make(map[string]*TerminalSession)
}

// Saves the config file
func (app *App) Shutdown(ctx context.Context) {
	if app.IsInDirDiffMode() {
		return // no need to update config in this case
	}

	err := app.AppConfig.SaveAppConfig()
	if err != nil {
		Log.Error("Failed to save application configuration: %v\n", err)
	}
}

func (a *App) GetAppState() *App {
	Log.Debug("AppState: %v\n", PrettyPrint(a))
	return a
}

// Walks the directories we need to diff
func (app *App) GetDirectoryDiffDetails() *Directory {
	if !app.IsInDirDiffMode() {
		return nil
	}

	dirDiff := app.StartupState.DirectoryDiff
	return readDiffs(dirDiff)
}

func (app *App) IsInDirDiffMode() bool {
	if app.StartupState == nil || app.StartupState.DirectoryDiff == nil {
		return false
	}

	return true
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
	SetupXTermForNewRepo(app, repoPath)
}

func (app *App) OnTerminalSessionWasResized(repoPath string, newSize TTYSize) {
	session, exists := app.terminalSessions[repoPath]
	if !exists {
		Log.Error("Tried to resize a non-existent session")
		return
	}

	ResizePtySession(session, newSize)
}

func (app *App) CleanupTerminalSession(repoPath string) {
	// Remove the session from the map of sessions, and run any clean up logic
	if session, exists := app.terminalSessions[repoPath]; exists {
		Log.Info("Deleting the session for repo: %v", repoPath)
		session.waiter.Done() // This should invoke the defer logic where the session got created
		delete(app.terminalSessions, repoPath)
	}
}

func (app *App) RunGitLog(gitRepoPath string) []GitLogCommitInfo {
	return readGitLog(gitRepoPath)
}
