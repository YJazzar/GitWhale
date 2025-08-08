package backend

import (
	"gitwhale/backend/lib"
	"gitwhale/backend/logger"
	"os"

	"github.com/fsnotify/fsnotify"
)

type StartupState struct {
	fileDiffWatcher   *fsnotify.Watcher
	DirectoryDiffArgs *StartupDirectoryDiffArgs `json:"directoryDiffArgs"`
}

type StartupDirectoryDiffArgs struct {
	LeftPath               string `json:"leftFolderPath"`
	RightPath              string `json:"rightFolderPath"`
	IsFileDiff             bool   // TODO: unsupported flag for now
	ShouldSendNotification bool   // True means that there's another active GitWhale process showing file diffs
	ShouldStartFileWatcher bool   // Mutually exclusive with ShouldSendNotification
}

func GetStartupState() *StartupState {

	// args := []string{
	// 	"/Users/yousufjazzar/Desktop/gitwhale/build/bin/gitwhale.app/Contents/MacOS/gitwhale  ",
	// 	"--dir-diff",
	// 	"/var/folders/4x/3dxp61h50d3bt6jvwvb2bz4m0000gn/T/git-difftool.Znmni5/left/",
	// 	"/var/folders/4x/3dxp61h50d3bt6jvwvb2bz4m0000gn/T/git-difftool.Znmni5/right/",
	// }

	args := os.Args

	if len(args) != 4 {
		// test code
		// return &StartupState{
		// 	DirectoryDiff: &StartupDirectoryDiffArgs{
		// 		LeftFolderPath:  "/var/folders/4x/3dxp61h50d3bt6jvwvb2bz4m0000gn/T/git-difftool.F12WVC/left/",
		// 		RightFolderPath: "/var/folders/4x/3dxp61h50d3bt6jvwvb2bz4m0000gn/T/git-difftool.F12WVC/right/",
		// 	},
		// }

		logger.Log.Info("Returning default state from getStartupState() because the length was incorrect: %v", len(args))
		return &StartupState{}
	}

	if args[1] != "--diff-tool" {
		logger.Log.Error("Returning default state from getStartupState() because the first flag was incorrect: %v", args[1])
		return &StartupState{}
	}

	logger.Log.Debug("Returning a valid startup state from getStartupState() ")

	isLeftDir, err := lib.IsDir(args[2])
	if err != nil {
		logger.Log.Error("Ran into the following error while testing if '%v' is a directory: %v", args[2], err)
		return &StartupState{}
	}

	isRightDir, err := lib.IsDir(args[3])
	if err != nil {
		logger.Log.Error("Ran into the following error while testing if '%v' is a directory: %v", args[3], err)
		return &StartupState{}
	}

	shouldSendNotification, err := lib.IsFileDiffNotificationLockFileExists()
	if err != nil {
		logger.Log.Error("Error while checking file diff lock file: %v", err)
		return &StartupState{}
	}

	return &StartupState{
		DirectoryDiffArgs: &StartupDirectoryDiffArgs{
			LeftPath:               args[2],
			RightPath:              args[3],
			IsFileDiff:             !isLeftDir && !isRightDir,
			ShouldSendNotification: shouldSendNotification,
			ShouldStartFileWatcher: !shouldSendNotification,
		},
	}
}
