//go:build windows
// +build windows

package command_utils

import (
	"os/exec"
	"runtime"
	"syscall"
)

// hideWindowsConsole hides the console window on Windows
func HideWindowsConsole(cmd *exec.Cmd) {
	if runtime.GOOS == "windows" {
		cmd.SysProcAttr = &syscall.SysProcAttr{
			HideWindow: true,
		}
	}
}
