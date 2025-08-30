package command_utils

import (
	"bytes"
	"context"
	"fmt"
	"gitwhale/backend/logger"
	"io"
	goruntime "runtime"

	"sync"

	"github.com/runletapp/go-console"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type XTermSessionManager struct {
	Settings              *TerminalSettings
	Ctx                   context.Context
	TerminalSessions      map[string]*TerminalSession
	TerminalSessionsMutex sync.RWMutex
}

type TerminalSession struct {
	consoleSession *console.Console
	waiter         sync.WaitGroup
	cancel         context.CancelFunc
}

type TerminalSettings struct {
	DefaultShellForBackgroundCommands string `json:"defaultShellForBackgroundCommands"`
	DefaultInteractiveTerminalCommand string `json:"defaultInteractiveTerminalCommand"`
	FontSize                          int    `json:"fontSize"`
	ColorScheme                       string `json:"colorScheme"`
	CursorStyle                       string `json:"cursorStyle"`
}

func (sessionManager *XTermSessionManager) GetDefaultInteractiveTerminalCommand() []string {
	if goruntime.GOOS == "windows" {
		return []string{"C:\\Program Files\\Git\\bin\\bash.exe", "--login", "-i"}
	} else {
		return []string{"/bin/zsh", "-il"}
	}
}

func (sessionManager *XTermSessionManager) GetDefaultShellForBackgroundCommands() []string {
	if goruntime.GOOS == "windows" {
		return []string{"C:\\Program Files\\Git\\bin\\bash.exe", "-c"}
	} else {
		return []string{"/bin/zsh", "-c"}
	}
}

func (sessionManager *XTermSessionManager) ResolveConfiguredShellCommand() []string {
	if sessionManager.Settings != nil && sessionManager.Settings.DefaultInteractiveTerminalCommand != "" {
		return []string{sessionManager.Settings.DefaultInteractiveTerminalCommand}
	}

	return sessionManager.GetDefaultInteractiveTerminalCommand()
}

func (sessionManager *XTermSessionManager) SetupXTermForNewRepo(repoPath string) {
	sessionManager.TerminalSessionsMutex.RLock()
	_, exists := sessionManager.TerminalSessions[repoPath]
	sessionManager.TerminalSessionsMutex.RUnlock()

	if exists {
		return
	}

	logger.Log.Info("Setting up a new terminal session for the repo: %v", repoPath)

	go func() {
		sessionManager.createXTermSession(repoPath)
	}()
}

func (sessionManager *XTermSessionManager) DisposeXTermSession(repoPath string) {
	logger.Log.Info("Disposing terminal session for repo: %v", repoPath)

	sessionManager.TerminalSessionsMutex.Lock()
	session, exists := sessionManager.TerminalSessions[repoPath]
	if !exists {
		sessionManager.TerminalSessionsMutex.Unlock()
		logger.Log.Warning("No terminal session found for repo: %v", repoPath)
		return
	}

	// Remove the session from the map first
	delete(sessionManager.TerminalSessions, repoPath)
	sessionManager.TerminalSessionsMutex.Unlock()

	// Cancel the context to signal goroutines to stop
	if session.cancel != nil {
		session.cancel()
	}

	// End the go routine
	session.waiter.Done()

	// Remove the event listener for terminal data
	runtime.EventsOff(sessionManager.Ctx, fmt.Sprintf("onTerminalData://%v", repoPath))

	logger.Log.Info("Terminal session for repo %v disposed successfully", repoPath)
}

// TTYSize represents a JSON structure to be sent by the frontend
// xterm.js implementation to the xterm.js websocket handler
type TTYSize struct {
	Cols int `json:"cols"`
	Rows int `json:"rows"`
}

func (sessionManager *XTermSessionManager) createXTermSession(repoPath string) {
	// Create context for this session
	ctx, cancel := context.WithCancel(sessionManager.Ctx)
	defer cancel()

	// Create console with default size
	proc, err := console.New(120, 60)
	if err != nil {
		logger.Log.Error("Failed to create console: %s", err)
		return
	}
	defer proc.Close()

	shellStartupCommand := sessionManager.ResolveConfiguredShellCommand()

	// Set working directory
	proc.SetCWD(repoPath)

	// Start the terminal process
	if err := proc.Start(shellStartupCommand); err != nil {
		logger.Log.Error("Failed to start terminal: %s", err)
		return
	}

	session := &TerminalSession{
		consoleSession: &proc,
		waiter:         sync.WaitGroup{},
		cancel:         cancel,
	}
	session.waiter.Add(1)

	// Thread-safe session storage
	sessionManager.TerminalSessionsMutex.Lock()
	sessionManager.TerminalSessions[repoPath] = session
	sessionManager.TerminalSessionsMutex.Unlock()

	maxBufferSizeBytes := 512

	// console >> xterm.js (read from terminal and send to frontend)
	go func() {
		defer session.waiter.Done()

		for {
			select {
			case <-ctx.Done():
				logger.Log.Debug("Terminal session context cancelled, ending read loop...")
				return
			default:
				buffer := make([]byte, maxBufferSizeBytes)
				readLength, err := proc.Read(buffer)

				// We get an io.EOF error when the terminal is shutting down
				if err == io.EOF {
					logger.Log.Debug("Received EOF err, ending terminal infinite read loop...")
					return
				}

				if err != nil {
					logger.Log.Warning("Ending session... Failed to read from console: %s", err)
					return
				}
				// logger.Log.Trace("Sending data to client: %v", buffer[:readLength])
				runtime.EventsEmit(sessionManager.Ctx, fmt.Sprintf("onTerminalDataReturned://%v", repoPath), buffer[:readLength])
			}
		}
	}()

	// console << xterm.js (receive from frontend and write to terminal)
	runtime.EventsOn(sessionManager.Ctx, fmt.Sprintf("onTerminalData://%v", repoPath), func(optionalData ...interface{}) {
		// Check if context is cancelled before processing
		select {
		case <-ctx.Done():
			logger.Log.Debug("Terminal session context cancelled, ignoring input data...")
			return
		default:
		}

		var dataBuffer bytes.Buffer
		for _, input := range optionalData {
			data, ok := input.(string)
			if !ok {
				logger.Log.Error("Could not cast optionalData into string: %v", input)
				continue
			}
			dataBuffer.WriteString(data)
		}

		logger.Log.Debug("Parsed bytes: %v", dataBuffer)

		// write to console
		bytesWritten, err := proc.Write(dataBuffer.Bytes())
		if err != nil {
			logger.Log.Warning("Failed to write %v bytes to console: %s", len(dataBuffer.Bytes()), err)
			return
		}
		logger.Log.Trace("%v bytes written to console...", bytesWritten)
	})

	// Wait for the process to finish
	if _, err := proc.Wait(); err != nil {
		logger.Log.Warning("Console process ended with error: %s", err)
	}

	session.waiter.Wait()
}

func (sessionManager *XTermSessionManager) ResizeConsoleSession(repoPath string, newSize TTYSize) {
	session, exists := sessionManager.TerminalSessions[repoPath]
	if !exists {
		logger.Log.Error("Tried to resize a non-existent session")
		return
	}

	(*session.consoleSession).SetSize(newSize.Cols, newSize.Rows)
}
