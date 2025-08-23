package command_utils

import (
	"gitwhale/backend/logger"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

func RunCommandAndLogErr(command *exec.Cmd) (string, error) {
	// Log the command being executed with full details
	logger.Log.Debug("Executing git command: %s", strings.Join(command.Args, " "))
	logger.Log.Trace("\t- Command working directory: %s", command.Dir)
	logger.Log.Trace("\t- Command environment variables: %v", command.Env)

	// Record start time and log to command buffer
	startTime := time.Now()

	// Get working directory (fallback to current dir if not set)
	workingDir := command.Dir
	if workingDir == "" {
		workingDir, _ = filepath.Abs(".")
	}

	// Log command start to buffer
	commandID := LogCommandStart(command.Path, command.Args, workingDir)

	HideWindowsConsole(command)
	result, err := command.CombinedOutput()

	// Log execution time
	duration := time.Since(startTime)
	logger.Log.Trace("\t- Command execution time: %v", duration)

	// Determine exit code
	exitCode := 0
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			exitCode = exitError.ExitCode()
			logger.Log.Error("\t- Git command failed with exit code %d: %s", exitCode, strings.Join(command.Args, " "))
			logger.Log.Error("\t- Command stderr: %s", string(exitError.Stderr))
		} else {
			exitCode = 420 // Generic error code
			logger.Log.Error("\t- Error running git command: [%v] -> %v", command.Args, err)
		}
		logger.Log.Debug("\t- Failed command output: %s", string(result))
	} else {
		logger.Log.Debug("\t- Git command completed successfully: %s", strings.Join(command.Args, " "))
		logger.Log.Debug("\t- Command output length: %d bytes", len(result))
		if len(result) > 0 && len(result) < 1000 {
			logger.Log.Trace("\t- Command output: %s", strings.TrimSpace(string(result)))
		}
	}

	// Log command completion to buffer
	output := string(result)
	errorOutput := ""
	if err != nil {
		errorOutput = err.Error()
	}
	LogCommandEnd(commandID, output, errorOutput, exitCode)

	return output, err
}
