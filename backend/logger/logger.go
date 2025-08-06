package logger

import (
	"context"
	"fmt"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type LogLevel int

const (
	Print LogLevel = iota
	Trace
	Debug
	Info
	Warning
	Error
	Fatal
)

type LogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
}

type LogBuffer struct {
	entries []LogEntry
	maxSize int
}

func levelToString(level LogLevel) string {
	switch level {
	case Print:
		return "PRINT"
	case Trace:
		return "TRACE"
	case Debug:
		return "DEBUG"
	case Info:
		return "INFO"
	case Warning:
		return "WARNING"
	case Error:
		return "ERROR"
	case Fatal:
		return "FATAL"
	default:
		return "UNKNOWN"
	}
}

type Logger struct {
	ctx context.Context
}

var Log = Logger{}

var logBuffer = &LogBuffer{
	entries: make([]LogEntry, 0),
	maxSize: 1000, // Keep last 1000 log entries
}

func (logger *Logger) SetContext(context context.Context) {
	logger.ctx = context
}

func (logger *Logger) GetCachedLogEntries() []LogEntry {
	entries := logBuffer.entries
	return entries
}

func (logger *Logger) ClearLogEntries() {
	logBuffer.entries = make([]LogEntry, 0)
}

func (logger *Logger) Log(level LogLevel, message string, args ...interface{}) {
	formattedMessage := fmt.Sprintf(message, args...)

	entry := LogEntry{
		Timestamp: time.Now(),
		Level:     levelToString(level),
		Message:   formattedMessage,
	}

	logBuffer.entries = append(logBuffer.entries, entry)
	if len(logBuffer.entries) > logBuffer.maxSize {
		logBuffer.entries = logBuffer.entries[1:] // Remove oldest
	}

	if logger.ctx != nil {
		runtime.EventsEmit(logger.ctx, "log:entry", entry)
	} else {
		// Continue with existing Wails logging
		fmt.Printf("[NO CTX DEFINED IN LOGGER]: %v\n", formattedMessage)
		return
	}

	if level == Print {
		runtime.LogPrintf(logger.ctx, message, args...)
	} else if level == Trace {
		runtime.LogTracef(logger.ctx, message, args...)
	} else if level == Debug {
		runtime.LogDebugf(logger.ctx, message, args...)
	} else if level == Info {
		runtime.LogInfof(logger.ctx, message, args...)
	} else if level == Warning {
		runtime.LogWarningf(logger.ctx, message, args...)
	} else if level == Error {
		runtime.LogErrorf(logger.ctx, message, args...)
	} else if level == Fatal {
		runtime.LogFatalf(logger.ctx, message, args...)
	}
}

// LogPrintf prints a Print level message
func (logger *Logger) Print(format string, args ...interface{}) {
	logger.Log(Print, format, args...)
}

// LogTracef prints a Trace level message
func (logger *Logger) Trace(format string, args ...interface{}) {
	logger.Log(Trace, format, args...)
}

// LogDebugf prints a Debug level message
func (logger *Logger) Debug(format string, args ...interface{}) {
	logger.Log(Debug, format, args...)
}

// LogInfof prints a Info level message
func (logger *Logger) Info(format string, args ...interface{}) {
	logger.Log(Info, format, args...)
}

// LogWarningf prints a Warning level message
func (logger *Logger) Warning(format string, args ...interface{}) {
	logger.Log(Warning, format, args...)
}

// LogErrorf prints a Error level message
func (logger *Logger) Error(format string, args ...interface{}) {
	logger.Log(Error, format, args...)
}

// LogFatalf prints a Fatal level message
func (logger *Logger) Fatal(format string, args ...interface{}) {
	logger.Log(Fatal, format, args...)
}
