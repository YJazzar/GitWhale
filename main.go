package main

import (
	"context"
	"embed"
	"fmt"
	"os"

	"gitwhale/backend"

	"github.com/leaanthony/u"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := backend.NewApp()

	backend.Log.Debug("Parsed OS Args: '%v'\n", os.Args)

	pid := os.Getpid()

	startupState := backend.GetStartupState()
	if startupState != nil && startupState.DirectoryDiff != nil && startupState.DirectoryDiff.IsFileDiff {
		if startupState.DirectoryDiff.ShouldSendNotification {
			// Make the other GitWhale process show the diff instead
			backend.SendFileDiffNotification(startupState.DirectoryDiff.LeftPath, startupState.DirectoryDiff.RightPath)
			return
		}
	}

	// Create application with options
	err := wails.Run(&options.App{
		Title:  fmt.Sprint("[", pid, "] ", backend.APP_NAME),
		Width:  1300,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup: func(ctx context.Context) {
			app.Startup(ctx, startupState)
		},
		OnShutdown: app.Shutdown,
		Bind: []interface{}{
			app,
		},
		// LogLevel: logger.INFO,
		Mac: &mac.Options{
			Preferences: &mac.Preferences{
				TabFocusesLinks:        u.NewBool(true),
				TextInteractionEnabled: u.NewBool(true),
			},
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
