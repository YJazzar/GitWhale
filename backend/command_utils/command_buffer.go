package command_utils

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

type CommandStatus int

const (
	CommandRunning CommandStatus = iota
	CommandSuccess
	CommandFailed
	CommandCancelled
)

func (s CommandStatus) String() string {
	switch s {
	case CommandRunning:
		return "RUNNING"
	case CommandSuccess:
		return "SUCCESS"
	case CommandFailed:
		return "FAILED"
	default:
		return "UNKNOWN"
	}
}

type CommandEntry struct {
	ID               string        `json:"id"`
	Command          string        `json:"command"`
	Args             []string      `json:"args"`
	FullCommand      string        `json:"fullCommand"`
	WorkingDirectory string        `json:"workingDirectory"`
	StartTime        time.Time     `json:"startTime"`
	EndTime          *time.Time    `json:"endTime,omitempty"`
	Output           string        `json:"output"`
	ErrorOutput      string        `json:"errorOutput"`
	ExitCode         *int          `json:"exitCode,omitempty"`
	Status           CommandStatus `json:"status"`
	Duration         time.Duration `json:"duration"`
}

type CommandBuffer struct {
	entries []CommandEntry
	maxSize int
	mutex   sync.RWMutex
	ctx     context.Context
}

var commandBuffer = &CommandBuffer{
	entries: make([]CommandEntry, 0),
	maxSize: 100, // Keep last 100 commands
}

// SetContext sets the context for event emission
func (cb *CommandBuffer) SetContext(ctx context.Context) {
	cb.mutex.Lock()
	defer cb.mutex.Unlock()
	cb.ctx = ctx
}

// LogCommandStart logs the start of a command execution
func (cb *CommandBuffer) LogCommandStart(command string, args []string, workingDir string) string {
	cb.mutex.Lock()
	defer cb.mutex.Unlock()

	commandID := uuid.New().String()
	entry := CommandEntry{
		ID:               commandID,
		Command:          command,
		Args:             args,
		FullCommand:      fmt.Sprintf("%v %v", command, strings.Join(args, " ")),
		WorkingDirectory: workingDir,
		StartTime:        time.Now(),
		Status:           CommandRunning,
		Duration:         0,
	}

	cb.entries = append(cb.entries, entry)
	if len(cb.entries) > cb.maxSize {
		cb.entries = cb.entries[1:] // Remove oldest
	}

	return commandID
}

// LogCommandEnd logs the completion of a command execution
func (cb *CommandBuffer) LogCommandEnd(commandID string, output string, errorOutput string, exitCode int) {
	cb.mutex.Lock()
	defer cb.mutex.Unlock()

	// Find the command entry
	for i, entry := range cb.entries {
		if entry.ID == commandID {
			endTime := time.Now()
			duration := endTime.Sub(entry.StartTime)

			// Determine status based on exit code
			status := CommandSuccess
			if exitCode != 0 {
				status = CommandFailed
			}

			// Update the entry
			cb.entries[i].EndTime = &endTime
			cb.entries[i].Output = output
			cb.entries[i].ErrorOutput = errorOutput
			cb.entries[i].ExitCode = &exitCode
			cb.entries[i].Status = status
			cb.entries[i].Duration = duration
			break
		}
	}
}

// LogCommandAppendMoreOutput appends additional output to an existing command entry
func (cb *CommandBuffer) LogCommandAppendMoreOutput(commandID string, output string, isErrorOutput bool) {
	cb.mutex.Lock()
	defer cb.mutex.Unlock()

	// Find the command entry
	for i, entry := range cb.entries {
		if entry.ID == commandID {
			if isErrorOutput {
				cb.entries[i].ErrorOutput += output
			} else {
				cb.entries[i].Output += output
			}
			break
		}
	}
}

// LogCommandEndStreamableCommand finalizes a streamed command without overwriting output
func (cb *CommandBuffer) LogCommandEndStreamableCommand(commandID string, exitCode int, wasCancelled bool) {
	cb.mutex.Lock()
	defer cb.mutex.Unlock()

	// Find the command entry
	for i, entry := range cb.entries {
		if entry.ID == commandID {
			endTime := time.Now()
			duration := endTime.Sub(entry.StartTime)

			// Determine status based on exit code
			status := CommandSuccess
			if exitCode != 0 {
				status = CommandFailed
			} else if wasCancelled {
				status = CommandCancelled
			}

			// Update only completion fields, preserve existing output
			cb.entries[i].EndTime = &endTime
			cb.entries[i].ExitCode = &exitCode
			cb.entries[i].Status = status
			cb.entries[i].Duration = duration
			break
		}
	}
}

// GetCachedCommandEntries returns all cached command entries
func (cb *CommandBuffer) GetCachedCommandEntries() []CommandEntry {
	cb.mutex.RLock()
	defer cb.mutex.RUnlock()

	// Create a copy to avoid race conditions
	entries := make([]CommandEntry, len(cb.entries))
	copy(entries, cb.entries)

	// Calculate live duration for running commands
	now := time.Now()
	for i, entry := range entries {
		if entry.Status == CommandRunning {
			entries[i].Duration = now.Sub(entry.StartTime)
		}
	}

	// Return in reverse order (newest first)
	for i, j := 0, len(entries)-1; i < j; i, j = i+1, j-1 {
		entries[i], entries[j] = entries[j], entries[i]
	}

	return entries
}

// GetCommandById returns a specific command entry by ID
func (cb *CommandBuffer) GetCommandById(commandID string) *CommandEntry {
	cb.mutex.RLock()
	defer cb.mutex.RUnlock()

	for _, entry := range cb.entries {
		if entry.ID == commandID {
			// Calculate live duration for running commands
			entryCopy := entry
			if entry.Status == CommandRunning {
				entryCopy.Duration = time.Since(entry.StartTime)
			}
			return &entryCopy
		}
	}
	return nil
}

// ClearCommandEntries clears all cached command entries
func (cb *CommandBuffer) ClearCommandEntries() {
	cb.mutex.Lock()
	defer cb.mutex.Unlock()

	cb.entries = make([]CommandEntry, 0)
}

// Global functions for easy access
func SetCommandBufferContext(ctx context.Context) {
	commandBuffer.SetContext(ctx)
}

func LogCommandStart(command string, args []string, workingDir string) string {
	return commandBuffer.LogCommandStart(command, args, workingDir)
}

func LogCommandEnd(commandID string, output string, errorOutput string, exitCode int) {
	commandBuffer.LogCommandEnd(commandID, output, errorOutput, exitCode)
}

func LogCommandAppendMoreOutput(commandID string, output string, isErrorOutput bool) {
	commandBuffer.LogCommandAppendMoreOutput(commandID, output, isErrorOutput)
}

func LogCommandEndStreamableCommand(commandID string, exitCode int, wasCancelled bool) {
	commandBuffer.LogCommandEndStreamableCommand(commandID, exitCode, wasCancelled)
}

func GetCachedCommandEntries() []CommandEntry {
	return commandBuffer.GetCachedCommandEntries()
}

func GetCommandById(commandID string) *CommandEntry {
	return commandBuffer.GetCommandById(commandID)
}

func ClearCommandEntries() {
	commandBuffer.ClearCommandEntries()
}
