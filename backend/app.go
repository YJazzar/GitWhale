package backend

import (
	"context"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
}

type StartupState struct {
	DirectoryDiff StartupDirectoryDiffArgs `json:"directoryDiff"`
}

type StartupDirectoryDiffArgs struct {
	LeftFolderPath  string `json:"leftFolderPath"`
	RightFolderPath string `json:"rightFolderPath"`
}

func (a *App) GetStartupState() *StartupState {
	return &StartupState{
		DirectoryDiff: StartupDirectoryDiffArgs{
			LeftFolderPath:  "/var/folders/4x/3dxp61h50d3bt6jvwvb2bz4m0000gn/T/git-difftool.VunxSB/left/",
			RightFolderPath: "/var/folders/4x/3dxp61h50d3bt6jvwvb2bz4m0000gn/T/git-difftool.VunxSB/right/",
		},
	}
}

func (a *App) GetDirectoryDiffDetails() {
	dirDiff := a.GetStartupState().DirectoryDiff
	readDirDiffStructure(&dirDiff)
}
