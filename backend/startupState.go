package backend

import "os"

type StartupState struct {
	DirectoryDiff *StartupDirectoryDiffArgs `json:"directoryDiff"`
}

type StartupDirectoryDiffArgs struct {
	LeftPath  string `json:"leftFolderPath"`
	RightPath string `json:"rightFolderPath"`
}

func getStartupState() *StartupState {

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

		Log.Info("Returning nil from getStartupState() because the length was incorrect: %v", len(args))
		return nil
	}

	if args[1] != "--diff-tool" {
		Log.Error("Returning nil from getStartupState() because the first flag was incorrect: %v", args[1])
		return nil
	}

	Log.Debug("Returning a valid startup state from getStartupState() ")

	return &StartupState{
		DirectoryDiff: &StartupDirectoryDiffArgs{
			LeftPath:  args[2],
			RightPath: args[3],
		},
	}
}
