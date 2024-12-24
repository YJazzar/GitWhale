package main

import (
	"embed"
	"fmt"
	"os"

	. "gitwhale/backend"

	"github.com/leaanthony/u"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()

	println("Here are the os args:")
	fmt.Printf("%+v\n", os.Args)
	println("finish args")

	// if true {
	// 	return
	// }

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "gitwhale",
		Width:  1300,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.Startup,
		OnShutdown:       app.Shutdown,
		Bind: []interface{}{
			app,
		},
		LogLevel: logger.INFO,
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
