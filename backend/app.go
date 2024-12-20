package backend

import (
	"context"
	"fmt"
	"os"
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
	DirectoryDiff *StartupDirectoryDiffArgs `json:"directoryDiff"`
}

type StartupDirectoryDiffArgs struct {
	LeftFolderPath  string `json:"leftFolderPath"`
	RightFolderPath string `json:"rightFolderPath"`
}

func (a *App) GetStartupState() *StartupState {

	args := os.Args
	// if len(args) < 3 {
	// 	return &StartupState{}
	// }
	if len(args) != 3 {
		// test code
		return &StartupState{
			DirectoryDiff: &StartupDirectoryDiffArgs{
				LeftFolderPath:  "/var/folders/4x/3dxp61h50d3bt6jvwvb2bz4m0000gn/T/git-difftool.F12WVC/left/",
				RightFolderPath: "/var/folders/4x/3dxp61h50d3bt6jvwvb2bz4m0000gn/T/git-difftool.F12WVC/right/",
			},
		}
	}

	return &StartupState{
		DirectoryDiff: &StartupDirectoryDiffArgs{
			LeftFolderPath:  args[1],
			RightFolderPath: args[2],
		},
	}
}

func (a *App) GetDirectoryDiffDetails() *Directory {
	dirDiff := a.GetStartupState().DirectoryDiff
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
