package command_utils

import (
	"gitwhale/backend/logger"
	"os/exec"
	"strings"
	"time"
)

func RunCommandAndLogErr(command *exec.Cmd) (string, error) {
	// Log the command being executed with full details
	logger.Log.Debug("Executing git command: %s", strings.Join(command.Args, " "))
	logger.Log.Debug("\t- Command working directory: %s", command.Dir)
	logger.Log.Debug("\t- Command environment variables: %v", command.Env)

	// Record start time
	startTime := time.Now()

	HideWindowsConsole(command)
	result, err := command.CombinedOutput()

	// Log execution time
	duration := time.Since(startTime)
	logger.Log.Debug("\t- Command execution time: %v", duration)

	if err != nil {
		// Get more detailed error information
		if exitError, ok := err.(*exec.ExitError); ok {
			logger.Log.Error("\t- Git command failed with exit code %d: %s", exitError.ExitCode(), strings.Join(command.Args, " "))
			logger.Log.Error("\t- Command stderr: %s", string(exitError.Stderr))
		} else {
			logger.Log.Error("\t- Error running git command: [%v] -> %v", command.Args, err)
		}
		logger.Log.Debug("\t- Failed command output: %s", string(result))
	} else {
		logger.Log.Debug("\t- Git command completed successfully: %s", strings.Join(command.Args, " "))
		logger.Log.Debug("\t- Command output length: %d bytes", len(result))
		if len(result) > 0 && len(result) < 1000 {
			logger.Log.Debug("\t- Command output: %s", strings.TrimSpace(string(result)))
		}
	}

	return string(result), err
}
