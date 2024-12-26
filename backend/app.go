package backend

import (
	"context"
	"fmt"
	"os"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var APP_NAME = "GitWhale"

// App struct
type App struct {
	ctx          context.Context
	IsLoading    bool          `json:"isLoading"`
	StartupState *StartupState `json:"startupState"`
	AppConfig    *AppConfig    `json:"appConfig"`
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
		return
	}

	Log.Trace("Running App.Startup()")

	app.StartupState = getStartupState()
	app.AppConfig = appConfig
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
	return readDirDiffStructure(dirDiff)
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
	return app
}
