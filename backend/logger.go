package backend

import (
	"context"
	"fmt"

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

type Logger struct {
	ctx context.Context
}

var Log = Logger{}

func (logger *Logger) setContext(context context.Context) {
	logger.ctx = context
}

func (logger *Logger) Log(level LogLevel, message string, args ...interface{}) {

	if logger.ctx == nil {
		fmt.Printf("[NO CTX DEFINED IN LOGGER]: %v", fmt.Sprintf(message, args...))
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
