//go:build !windows
// +build !windows

package command_utils

import (
	"os/exec"
)

// hideWindowsConsole hides the console window on Windows
func HideWindowsConsole(cmd *exec.Cmd) {

}
