package command_utils

import (
	"bufio"
	"context"
	"fmt"
	"gitwhale/backend/logger"
	"io"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// CommandExecutionState represents the current state of command execution
type CommandExecutionState string

const (
	StateStarted   CommandExecutionState = "started"
	StateOutput    CommandExecutionState = "output"
	StateCompleted CommandExecutionState = "completed"
	StateError     CommandExecutionState = "error"
	StateCancelled CommandExecutionState = "cancelled"
)

// StreamedCommandEvent represents an event emitted during command execution
type StreamedCommandEvent struct {
	State     CommandExecutionState `json:"state"`
	Output    string                `json:"output,omitempty"`
	Duration  string                `json:"duration,omitempty"`
	ExitCode  int                   `json:"exitCode,omitempty"`
	Error     string                `json:"error,omitempty"`
	Timestamp time.Time             `json:"timestamp"`
}

// activeCommands tracks running commands for cancellation
var activeCommands = make(map[string]*exec.Cmd)
var activeCommandsMutex sync.RWMutex

// cancelledCommands tracks which commands were explicitly cancelled
var cancelledCommands = make(map[string]bool)
var cancelledCommandsMutex sync.RWMutex

// StartRunningAndStreamCommand asynchronously executes a command and streams output
func StartRunningAndStreamCommand(ctx context.Context, commandString, workingDir, broadcastToTopic string) {
	logger.Log.Debug("StartRunningAndStreamCommand called - command: %s, topic: %s", commandString, broadcastToTopic)

	go func() {
		err := streamOutput(ctx, commandString, workingDir, broadcastToTopic)
		if err != nil {
			emitEvent(ctx, broadcastToTopic, StreamedCommandEvent{
				State:     StateError,
				Error:     err.Error(),
				Timestamp: time.Now(),
			})
			logger.Log.Error("Command streaming failed: %v", err)
		}
	}()

	// Set up cancellation listener
	go listenForCancellation(ctx, broadcastToTopic)
}

// listenForCancellation listens for cancellation events from the frontend
func listenForCancellation(ctx context.Context, broadcastToTopic string) {
	runtime.EventsOn(ctx, broadcastToTopic, func(optionalData ...interface{}) {
		if len(optionalData) <= 0 {
			return
		}

		if action, ok := optionalData[0].(string); ok && action == "cancel" {
			cancelCommand(broadcastToTopic)
			runtime.EventsOff(ctx, broadcastToTopic)
		}
	})
}

// cancelCommand cancels a running command
func cancelCommand(broadcastToTopic string) {
	activeCommandsMutex.Lock()
	defer activeCommandsMutex.Unlock()

	if cmd, exists := activeCommands[broadcastToTopic]; exists {
		// Mark command as cancelled
		cancelledCommandsMutex.Lock()
		cancelledCommands[broadcastToTopic] = true
		cancelledCommandsMutex.Unlock()

		if cmd.Process != nil {
			logger.Log.Debug("Cancelling command for topic: %s", broadcastToTopic)
			err := cmd.Process.Kill()
			if err != nil {
				logger.Log.Error("Failed to kill process: %v", err)
			}
		}
		delete(activeCommands, broadcastToTopic)
	}
}

// streamOutput executes the command and streams output in real-time
func streamOutput(ctx context.Context, commandString, workingDir, broadcastToTopic string) error {
	commandArgs := strings.Fields(commandString)
	if len(commandArgs) == 0 {
		return fmt.Errorf("empty command string")
	}

	// Create command
	command := exec.CommandContext(ctx, commandArgs[0], commandArgs[1:]...)
	command.Dir = workingDir

	// Log the command being executed
	logger.Log.Debug("Executing command: %s", strings.Join(command.Args, " "))
	logger.Log.Trace("\t- Command working directory: %s", command.Dir)

	// Start logging the command
	commandID := LogCommandStart(commandArgs[0], commandArgs[1:], workingDir)
	logger.Log.Debug("Started streaming command with ID: %s, topic: %s", commandID, broadcastToTopic)

	// Record start time
	startTime := time.Now()
	HideWindowsConsole(command)

	// Register command for cancellation
	activeCommandsMutex.Lock()
	activeCommands[broadcastToTopic] = command
	activeCommandsMutex.Unlock()

	// Emit started event
	emitEvent(ctx, broadcastToTopic, StreamedCommandEvent{
		State:     StateStarted,
		Timestamp: time.Now(),
	})

	// Set up pipes for stdout and stderr
	stdout, err := command.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdout pipe: %v", err)
	}

	stderr, err := command.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to create stderr pipe: %v", err)
	}

	// Start the command
	err = command.Start()
	if err != nil {
		return fmt.Errorf("failed to start command: %v", err)
	}

	// Stream output from both stdout and stderr
	var wg sync.WaitGroup
	wg.Add(2)

	go streamPipe(ctx, stdout, "stdout", broadcastToTopic, commandID, &wg)
	go streamPipe(ctx, stderr, "stderr", broadcastToTopic, commandID, &wg)

	// Wait for command to complete
	go func() {
		wg.Wait()

		// Wait for the command to finish
		cmdErr := command.Wait()

		// Calculate duration
		duration := time.Since(startTime)

		// Check if command was explicitly cancelled and clean it up from the map
		cancelledCommandsMutex.RLock()
		wasCancelled := cancelledCommands[broadcastToTopic]
		delete(cancelledCommands, broadcastToTopic)
		cancelledCommandsMutex.RUnlock()

		// Clean up active command tracking
		activeCommandsMutex.Lock()
		delete(activeCommands, broadcastToTopic)
		activeCommandsMutex.Unlock()

		// Determine final state and exit code
		var finalState CommandExecutionState
		var exitCode int
		var errorMsg string

		if wasCancelled {
			finalState = StateCancelled
			errorMsg = "Command was cancelled"
			logger.Log.Debug("Command was cancelled: %s", strings.Join(command.Args, " "))
		} else if cmdErr != nil {
			if exitError, ok := cmdErr.(*exec.ExitError); ok {
				exitCode = exitError.ExitCode()
				finalState = StateError
				errorMsg = fmt.Sprintf("Command failed with exit code %d", exitCode)
				logger.Log.Error("Command failed with exit code %d: %s", exitCode, strings.Join(command.Args, " "))
			} else {
				finalState = StateError
				errorMsg = cmdErr.Error()
				logger.Log.Error("Error running command: %v", cmdErr)
			}
		} else {
			finalState = StateCompleted
			logger.Log.Debug("Command completed successfully: %s", strings.Join(command.Args, " "))
		}

		// Finalize the streamed command (preserves accumulated output)
		LogCommandEndStreamableCommand(commandID, exitCode, wasCancelled)

		// Emit completion event with timing information
		emitEvent(ctx, broadcastToTopic, StreamedCommandEvent{
			State:     finalState,
			Duration:  duration.String(),
			ExitCode:  exitCode,
			Error:     errorMsg,
			Timestamp: time.Now(),
		})

		logger.Log.Trace("Command execution time: %v", duration)
	}()

	return nil
}

// streamPipe reads from a pipe and emits output events
func streamPipe(ctx context.Context, pipe io.ReadCloser, pipeType, broadcastToTopic, commandID string, wg *sync.WaitGroup) {
	defer wg.Done()
	defer pipe.Close()

	isErrorOutput := pipeType == "stderr"
	scanner := bufio.NewScanner(pipe)
	for scanner.Scan() {
		line := scanner.Text()
		if line != "" {
			output := line + "\n" // Add newline to preserve line breaks in the logged output

			// Append output to command log
			LogCommandAppendMoreOutput(commandID, output, isErrorOutput)

			// Emit event for real-time streaming (without the added newline for display)
			emitEvent(ctx, broadcastToTopic, StreamedCommandEvent{
				State:     StateOutput,
				Output:    line,
				Timestamp: time.Now(),
			})
		}
	}

	if err := scanner.Err(); err != nil {
		logger.Log.Error("Error reading from %s pipe: %v", pipeType, err)
	}
}

// emitEvent emits a StreamedCommandEvent to the frontend
func emitEvent(ctx context.Context, broadcastToTopic string, event StreamedCommandEvent) {
	runtime.EventsEmit(ctx, broadcastToTopic, event)
}
