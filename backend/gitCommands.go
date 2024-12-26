package backend

import (
	"os/exec"
	"strings"
)

func getCurrentBranchName(repoPath string) string {
	cmd := exec.Command("bash", "-c", "git rev-parse --abbrev-ref HEAD")
	cmd.Dir = repoPath
	return strings.TrimSpace(runCommandAndLogErr(cmd))
}

func runCommandAndLogErr(command *exec.Cmd) string {

	result, err := command.Output()
	if err != nil {
		Log.Error("Error running command: [%v] -> %v\n", command.Args, err)
	}

	return string(result)
}
