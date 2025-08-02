package backend

import (
	"bytes"
	"fmt"
	"io"
	goruntime "runtime"
	"sync"

	"github.com/runletapp/go-console"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func SetupXTermForNewRepo(app *App, repoPath string) {
	if _, exists := app.terminalSessions[repoPath]; exists {
		return
	}

	Log.Info("Setting up a new terminal session for the repo: %v", repoPath)

	go func() {
		CreateXTermSession(app, repoPath)
	}()
}

func DisposeXTermSession(app *App, repoPath string) {
	Log.Info("Disposing terminal session for repo: %v", repoPath)

	session, exists := app.terminalSessions[repoPath]
	if !exists {
		Log.Warning("No terminal session found for repo: %v", repoPath)
		return
	}

	// End the go routine
	session.waiter.Done()

	// Remove the event listener for terminal data
	runtime.EventsOff(app.ctx, fmt.Sprintf("onTerminalData://%v", repoPath))

	// Remove the session from the map
	delete(app.terminalSessions, repoPath)

	Log.Info("Terminal session for repo %v disposed successfully", repoPath)
}

// TTYSize represents a JSON structure to be sent by the frontend
// xterm.js implementation to the xterm.js websocket handler
type TTYSize struct {
	Cols int `json:"cols"`
	Rows int `json:"rows"`
}

func CreateXTermSession(app *App, repoPath string) {
	// Create console with default size
	proc, err := console.New(120, 60)
	if err != nil {
		Log.Error("Failed to create console: %s", err)
		return
	}
	defer proc.Close()

	// Get terminal settings
	defaultCommand := app.AppConfig.Settings.Terminal.DefaultCommand
	
	// Choose terminal based on settings or OS default
	var args []string
	if defaultCommand != "" {
		// Use the custom command from settings
		args = []string{defaultCommand}
	} else if goruntime.GOOS == "windows" {
		// Use Git Bash on Windows
		args = []string{"C:\\Program Files\\Git\\bin\\bash.exe", "--login", "-i"}
	} else {
		// Use zsh on Unix-based systems
		args = []string{"/bin/zsh", "-il"}
	}

	// Set working directory
	proc.SetCWD(repoPath)

	// Start the terminal process
	if err := proc.Start(args); err != nil {
		Log.Error("Failed to start terminal: %s", err)
		return
	}

	session := &TerminalSession{
		consoleSession: &proc,
		waiter:         sync.WaitGroup{},
	}
	session.waiter.Add(1)
	app.terminalSessions[repoPath] = session
	maxBufferSizeBytes := 512

	// console >> xterm.js (read from terminal and send to frontend)
	go func() {
		defer session.waiter.Done()

		for {
			buffer := make([]byte, maxBufferSizeBytes)
			readLength, err := proc.Read(buffer)

			// We get an io.EOF error when the terminal is shutting down
			if err == io.EOF {
				Log.Debug("Received EOF err, ending terminal infinite read loop...")
				return
			}

			if err != nil {
				Log.Warning("Ending session... Failed to read from console: %s", err)
				return
			}
			Log.Trace("Sending data to client: %v", buffer[:readLength])
			runtime.EventsEmit(app.ctx, fmt.Sprintf("onTerminalDataReturned://%v", repoPath), buffer[:readLength])
		}
	}()

	// console << xterm.js (receive from frontend and write to terminal)
	runtime.EventsOn(app.ctx, fmt.Sprintf("onTerminalData://%v", repoPath), func(optionalData ...interface{}) {
		// Log.Info("Received data: %v", PrettyPrint(optionalData))

		var dataBuffer bytes.Buffer
		for _, input := range optionalData {
			data, ok := input.(string)
			if !ok {
				Log.Error("Could not cast optionalData into string: %v", input)
				continue
			}
			dataBuffer.WriteString(data)
		}

		Log.Debug("Parsed bytes: %v", dataBuffer)

		// write to console
		bytesWritten, err := proc.Write(dataBuffer.Bytes())
		if err != nil {
			Log.Warning("Failed to write %v bytes to console: %s", len(dataBuffer.Bytes()), err)
			return
		}
		Log.Trace("%v bytes written to console...", bytesWritten)
	})

	// Wait for the process to finish
	if _, err := proc.Wait(); err != nil {
		Log.Warning("Console process ended with error: %s", err)
	}

	session.waiter.Wait()
}

func ResizeConsoleSession(session *TerminalSession, newSize TTYSize) {
	(*session.consoleSession).SetSize(newSize.Cols, newSize.Rows)
}
