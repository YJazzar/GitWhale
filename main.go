package main

import (
	"context"
	"embed"
	"fmt"
	"os"

	"gitwhale/backend"
	"gitwhale/backend/lib"
	"gitwhale/backend/logger"

	"github.com/leaanthony/u"
	"github.com/wailsapp/wails/v2"
	WailsLogger "github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := backend.NewApp()

	logger.Log.Debug("Parsed OS Args: '%v'", os.Args)

	pid := os.Getpid()

	startupState := backend.GetStartupState()
	if startupState != nil && startupState.DirectoryDiffArgs != nil && startupState.DirectoryDiffArgs.IsFileDiff {
		if startupState.DirectoryDiffArgs.ShouldSendNotification {
			// Make the other GitWhale process show the diff instead
			if err := backend.SendFileDiffNotification(startupState.DirectoryDiffArgs.LeftPath, startupState.DirectoryDiffArgs.RightPath); err != nil {
				fmt.Printf("Error sending file diff notification: %v\n", err)
				os.Exit(1)
			}
			return
		}
	}

	// Create application with options
	err := wails.Run(&options.App{
		Title:  fmt.Sprint("[", pid, "] ", lib.APP_NAME),
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
		LogLevel:           WailsLogger.DEBUG,
		LogLevelProduction: WailsLogger.DEBUG,
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
