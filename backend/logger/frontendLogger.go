package logger

import (
	"context"
	"fmt"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func SetupFrontEndLogger(ctx context.Context) {
	runtime.EventsOn(ctx, "frontend:log", func(optionalData ...interface{}) {
		if len(optionalData) == 0 {
			Log.Warning("Received empty frontend log event")
			return
		}

		// The frontend sends the log entry as a structured object
		logData, ok := optionalData[0].(map[string]interface{})
		if !ok {
			Log.Warning("Failed to parse frontend log data: %v", optionalData[0])
			return
		}

		// Extract fields from the log entry
		level, _ := logData["level"].(string)
		message, _ := logData["message"].(string)
		source, _ := logData["source"].(string)

		// Prefix the message to indicate it's from frontend
		var prefixedMessage string
		if source != "" {
			prefixedMessage = fmt.Sprintf("[Frontend:%s] %s", source, message)
		} else {
			prefixedMessage = fmt.Sprintf("[Frontend] %s", message)
		}

		// Route to appropriate backend log level
		switch level {
		case "PRINT":
			Log.Print(prefixedMessage)
		case "TRACE":
			Log.Trace(prefixedMessage)
		case "DEBUG":
			Log.Debug(prefixedMessage)
		case "INFO":
			Log.Info(prefixedMessage)
		case "WARNING":
			Log.Warning(prefixedMessage)
		case "ERROR":
			Log.Error(prefixedMessage)
		case "FATAL":
			Log.Fatal(prefixedMessage)
		default:
			Log.Info("[Frontend] %s", message) // Default to info level
		}
	})

	Log.Debug("Frontend log event listener setup complete")
}
