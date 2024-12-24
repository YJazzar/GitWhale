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
	StartupState     StartupState           `json:"startupState"`
	AppConfig        AppConfig              `json:"appConfig"`
	OpenRepoContexts map[string]RepoContext `json:"openRepoContexts"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) Startup(ctx context.Context) {

	appConfig, err := LoadAppConfig()
	if err != nil {
		fmt.Printf("An error occurred while reading the application's saved config: %v\n", err)
		return
	}

	a.ctx = ctx
	a.StartupState = *a.GetStartupState()
	a.AppConfig = *appConfig
	a.OpenRepoContexts = make(map[string]RepoContext)

	if appConfig.DefaultStartupRepo != "" {
		a.OpenRepoContexts[appConfig.DefaultStartupRepo] = *CreateContext(appConfig.DefaultStartupRepo)
	}
}

func (app *App) Shutdown(ctx context.Context) {
	err := app.AppConfig.SaveAppConfig()
	if err != nil {
		fmt.Printf("Failed to save application configuration: %v\n", err)
	}
}

type StartupState struct {
	DirectoryDiff *StartupDirectoryDiffArgs `json:"directoryDiff"`
}

type StartupDirectoryDiffArgs struct {
	LeftFolderPath  string `json:"leftFolderPath"`
	RightFolderPath string `json:"rightFolderPath"`
}

func (a *App) GetStartupState() *StartupState {

	args := os.Args
	if len(args) != 4 {
		// test code
		// return &StartupState{
		// 	DirectoryDiff: &StartupDirectoryDiffArgs{
		// 		LeftFolderPath:  "/var/folders/4x/3dxp61h50d3bt6jvwvb2bz4m0000gn/T/git-difftool.F12WVC/left/",
		// 		RightFolderPath: "/var/folders/4x/3dxp61h50d3bt6jvwvb2bz4m0000gn/T/git-difftool.F12WVC/right/",
		// 	},
		// }

		return nil
	}

	if args[1] != "--dir-diff" {
		return nil
	}

	return &StartupState{
		DirectoryDiff: &StartupDirectoryDiffArgs{
			LeftFolderPath:  args[2],
			RightFolderPath: args[3],
		},
	}
}

func (a *App) GetDirectoryDiffDetails() *Directory {
	if a.StartupState.DirectoryDiff == nil {
		return nil
	}

	dirDiff := a.StartupState.DirectoryDiff
	return readDirDiffStructure(dirDiff)
}

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
