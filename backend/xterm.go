package backend

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"

	"github.com/creack/pty"
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

	// stdin_reader, stdin_writer := io.Pipe()
	// reader := bufio.NewReader(stdin_reader)

	// stdout_writer := bytes.Buffer{}
	// writer := bufio.NewWriter(&stdout_writer)

	// rw := bufio.NewReadWriter(reader, writer)
	// terminalSession := term.NewTerminal(rw, "$$:> ")

	// // constantly be reading lines
	// go func() {
	// 	Log.Info("inside of a go-routine trying to infinitely read")

	// 	stdin_writer.Write([]byte("Test command"))
	// 	for {
	// 		Log.Error("Inside loop")
	// 		line, err := terminalSession.ReadLine()
	// 		if err == io.EOF {
	// 			Log.Info("got EOF")
	// 		}
	// 		if err != nil {
	// 			Log.Error("got err: %v", err)
	// 		}
	// 		if line == "" {
	// 			continue
	// 		}
	// 		Log.Info("LINE: %s", line)
	// 		runtime.EventsEmit(app.ctx, "onTerminalDataReturned://%v", repoPath)
	// 	}
	// }()

	// runtime.EventsOn(app.ctx, fmt.Sprintf("onTerminalData://%v", repoPath), func(optionalData ...interface{}) {
	// 	Log.Info("Received data: %v", PrettyPrint(optionalData))

	// 	var buffer bytes.Buffer
	// 	for _, input := range optionalData {

	// 		data, err := input.(string)
	// 		if !err {
	// 			Log.Error("Could not cast optionalData into bytes: %v", err)
	// 		}
	// 		buffer.WriteString(data)
	// 	}

	// 	Log.Info("Parsed bytes: %v", buffer.Bytes())
	// 	ret, err := terminalSession.Write(buffer.Bytes())

	// 	rw.Writer.Flush()
	// 	Log.Info("Return val: %v", ret)
	// 	Log.Info("Peturn val: %v", PrettyPrint(ret))
	// 	Log.Error("error: %v", err)
	// })

	// app.terminalSessions[repoPath] = terminalSession

}

// TTYSize represents a JSON structure to be sent by the frontend
// xterm.js implementation to the xterm.js websocket handler
type TTYSize struct {
	Cols uint16 `json:"cols"`
	Rows uint16 `json:"rows"`
}

func CreateXTermSession(app *App, repoPath string) {

	// Run the first terminal command
	cmd := exec.Command("/bin/zsh", "-il")
	cmd.Dir = repoPath
	cmd.Env = os.Environ()
	tty, err := pty.Start(cmd)
	if err != nil {
		Log.Error("Failed to start tty: %s", err)
		return
	}

	defer func() {
		Log.Info("Gracefully stopping spawned tty...")
		if err := cmd.Process.Kill(); err != nil {
			Log.Warning("Failed to kill process: %s", err)
		}
		if _, err := cmd.Process.Wait(); err != nil {
			Log.Warning("Failed to wait for process to exit: %s", err)
		}
		if err := tty.Close(); err != nil {
			Log.Warning("Failed to close spawned tty gracefully: %s", err)
		}
	}()

	session := &TerminalSession{
		ptySession: tty,
		waiter:     sync.WaitGroup{},
	}
	session.waiter.Add(1)
	app.terminalSessions[repoPath] = session
	maxBufferSizeBytes := 512

	// tty >> xterm.js
	go func() {
		for {
			buffer := make([]byte, maxBufferSizeBytes)
			readLength, err := tty.Read(buffer)

			// We get an io.EOF error when the terminal is shutting down
			if err == io.EOF {
				Log.Debug("Received EOF err, ending terminal infinite read loop...")
				return
			}

			if err != nil {
				Log.Warning("Ending session... Failed to read from tty: %s", err)
				session.waiter.Done()
				return
			}
			Log.Trace("Sending data to client: %v", buffer[:readLength])
			runtime.EventsEmit(app.ctx, fmt.Sprintf("onTerminalDataReturned://%v", repoPath), buffer[:readLength])
		}
	}()

	// tty << xterm.js
	runtime.EventsOn(app.ctx, fmt.Sprintf("onTerminalData://%v", repoPath), func(optionalData ...interface{}) {
		Log.Info("Received data: %v", PrettyPrint(optionalData))

		var dataBuffer bytes.Buffer
		for _, input := range optionalData {

			data, err := input.(string)
			if !err {
				Log.Error("Could not cast optionalData into bytes: %v", err)
			}
			dataBuffer.WriteString(data)
		}

		Log.Debug("Parsed bytes: %v", dataBuffer)

		// data processing
		// messageType, data, err := connection.ReadMessage()
		if err != nil {
			Log.Warning("Failed to read incoming data from xterm.js with err: %s", err)
			return
		}

		// write to tty
		bytesWritten, err := tty.Write(dataBuffer.Bytes())
		if err != nil {
			Log.Warning("Failed to write %v bytes to tty: %s", len(dataBuffer.Bytes()), err)
			return
		}
		Log.Trace("%v bytes written to tty...", bytesWritten)
	})

	session.waiter.Wait()
}

func ResizePtySession(session *TerminalSession, newSize TTYSize) {
	err := pty.Setsize(session.ptySession, &pty.Winsize{
		Rows: newSize.Rows,
		Cols: newSize.Cols,
	})

	if err != nil {
		Log.Warning("failed to resize tty, error: %s", err)
	}
}

// Old logic

// stdin_reader, stdin_writer := io.Pipe()
// reader := bufio.NewReader(stdin_reader)

// stdout_writer := bytes.Buffer{}
// writer := bufio.NewWriter(&stdout_writer)

// rw := bufio.NewReadWriter(reader, writer)
// terminalSession := term.NewTerminal(rw, "$$:> ")

// // constantly be reading lines
// go func() {
// 	Log.Info("inside of a go-routine trying to infinitely read")

// 	stdin_writer.Write([]byte("Test command"))
// 	for {
// 		Log.Error("Inside loop")
// 		line, err := terminalSession.ReadLine()
// 		if err == io.EOF {
// 			Log.Info("got EOF")
// 		}
// 		if err != nil {
// 			Log.Error("got err: %v", err)
// 		}
// 		if line == "" {
// 			continue
// 		}
// 		Log.Info("LINE: %s", line)
// 		runtime.EventsEmit(app.ctx, "onTerminalDataReturned://%v", repoPath)
// 	}
// }()

// runtime.EventsOn(app.ctx, fmt.Sprintf("onTerminalData://%v", repoPath), func(optionalData ...interface{}) {
// 	Log.Info("Received data: %v", PrettyPrint(optionalData))

// 	var buffer bytes.Buffer
// 	for _, input := range optionalData {

// 		data, err := input.(string)
// 		if !err {
// 			Log.Error("Could not cast optionalData into bytes: %v", err)
// 		}
// 		buffer.WriteString(data)
// 	}

// 	Log.Info("Parsed bytes: %v", buffer.Bytes())
// 	ret, err := terminalSession.Write(buffer.Bytes())

// 	rw.Writer.Flush()
// 	Log.Info("Return val: %v", ret)
// 	Log.Info("Peturn val: %v", PrettyPrint(ret))
// 	Log.Error("error: %v", err)
// app.terminalSessions[repoPath] = terminalSession
