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
	ctx              context.Context
	IsLoading        bool                   `json:"isLoading"`
	StartupState     *StartupState          `json:"startupState"`
	AppConfig        *AppConfig             `json:"appConfig"`
	OpenRepoContexts map[string]RepoContext `json:"openRepoContexts"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	app := App{}
	app.IsLoading = true
	fmt.Printf("Running newapp()")
	return &app
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (app *App) Startup(ctx context.Context) {
	app.ctx = ctx
	app.IsLoading = false

	appConfig, err := LoadAppConfig()
	if err != nil {
		fmt.Printf("An error occurred while reading the application's saved config: %v\n", err)
		return
	}

	fmt.Printf("Running App.NewApp()")

	app.StartupState = getStartupState()
	app.AppConfig = appConfig
	app.OpenRepoContexts = make(map[string]RepoContext)

	if appConfig.DefaultStartupRepo != "" {
		app.OpenRepoContexts[appConfig.DefaultStartupRepo] = *CreateContext(appConfig.DefaultStartupRepo)
	}
}

// Saves the config file
func (app *App) Shutdown(ctx context.Context) {
	err := app.AppConfig.SaveAppConfig()
	if err != nil {
		fmt.Printf("Failed to save application configuration: %v\n", err)
	}
}

func (a *App) GetAppState() *App {
	fmt.Printf("GetAppState() running")
	prettyPrint("AppState", a)
	return a
}

// Walks the directories we need to diff
func (a *App) GetDirectoryDiffDetails() *Directory {
	if a.StartupState == nil || a.StartupState.DirectoryDiff == nil {
		return nil
	}

	dirDiff := a.StartupState.DirectoryDiff
	return readDirDiffStructure(dirDiff)
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
func (app *App) OpenNewRepo() {
	newRepoPath, err := runtime.OpenDirectoryDialog(app.ctx, runtime.OpenDialogOptions{})
	if err != nil || newRepoPath == "" {
		return
	}

	app.AppConfig.addRepoToRecentList(newRepoPath)
}
