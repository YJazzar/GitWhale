package backend

import (
	"bufio"
	"bytes"
	"fmt"
	"io"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.org/x/term"
)

func SetupXTermForNewRepo(app *App, repoPath string) {
	if _, exists := app.terminalSessions[repoPath]; exists {
		return
	}

	Log.Info("Setting up a new terminal session for the repo: %v", repoPath)

	stdin_reader, stdin_writer := io.Pipe()
	reader := bufio.NewReader(stdin_reader)

	stdout_writer := bytes.Buffer{}
	writer := bufio.NewWriter(&stdout_writer)

	rw := bufio.NewReadWriter(reader, writer)
	terminalSession := term.NewTerminal(rw, "$$:> ")

	// constantly be reading lines
	go func() {
		Log.Info("inside of a go-routine trying to infinitely read")

		stdin_writer.Write([]byte("Test command"))
		for {
			Log.Error("Inside loop")
			line, err := terminalSession.ReadLine()
			if err == io.EOF {
				Log.Info("got EOF")
			}
			if err != nil {
				Log.Error("got err: %v", err)
			}
			if line == "" {
				continue
			}
			Log.Info("LINE: %s", line)
			runtime.EventsEmit(app.ctx, "onTerminalDataReturned://%v", repoPath)
		}
	}()

	runtime.EventsOn(app.ctx, fmt.Sprintf("onTerminalData://%v", repoPath), func(optionalData ...interface{}) {
		Log.Info("Received data: %v", PrettyPrint(optionalData))

		var buffer bytes.Buffer
		for _, input := range optionalData {

			data, err := input.(string)
			if !err {
				Log.Error("Could not cast optionalData into bytes: %v", err)
			}
			buffer.WriteString(data)
		}

		Log.Info("Parsed bytes: %v", buffer.Bytes())
		ret, err := terminalSession.Write(buffer.Bytes())

		rw.Writer.Flush()
		terminalSession.
			Log.Info("Return val: %v", ret)
		Log.Info("Peturn val: %v", PrettyPrint(ret))
		Log.Error("error: %v", err)
	})

	app.terminalSessions[repoPath] = terminalSession

}
