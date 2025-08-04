import { EventsEmit } from '../../wailsjs/runtime/runtime';

// Frontend log entry structure that matches backend expectations
interface FrontendLogEntry {
	timestamp: string; // ISO string format for JSON serialization
	level: string;
	message: string;
	source?: string; // Optional component/file identifier
}

// Log levels matching backend logger.go exactly
export enum LogLevel {
	PRINT = 'PRINT',
	TRACE = 'TRACE',
	DEBUG = 'DEBUG',
	INFO = 'INFO',
	WARNING = 'WARNING',
	ERROR = 'ERROR',
	FATAL = 'FATAL',
}

/**
 * Frontend Logger that emits log entries to the backend for centralized logging.
 * All logs will appear in the ApplicationLogsPage alongside backend logs.
 * 
 * Usage:
 * ```typescript
 * import { Logger } from '@/utils/logger';
 * 
 * Logger.info('Component mounted', 'HomePage');
 * Logger.error('Failed to load data', 'RepoPage');
 * Logger.debug('State updated', 'use-repo-state');
 * ```
 */
export class Logger {
	private static emit(level: LogLevel, message: string, source?: string): void {
		const logEntry: FrontendLogEntry = {
			timestamp: new Date().toISOString(),
			level: level,
			message: message,
			source: source,
		};

		// Emit to backend for processing and storage
		EventsEmit('frontend:log', logEntry);

		// Also log to browser console for development
		if (import.meta.env.DEV) {
			const consoleMessage = source ? `[${source}] ${message}` : message;
			
			switch (level) {
				case LogLevel.ERROR:
				case LogLevel.FATAL:
					console.error(consoleMessage);
					break;
				case LogLevel.WARNING:
					console.warn(consoleMessage);
					break;
				case LogLevel.DEBUG:
				case LogLevel.TRACE:
					console.debug(consoleMessage);
					break;
				case LogLevel.INFO:
				case LogLevel.PRINT:
				default:
					console.log(consoleMessage);
					break;
			}
		}
	}

	/**
	 * Logs a print-level message (equivalent to backend Print level)
	 */
	static print(message: string, source?: string): void {
		this.emit(LogLevel.PRINT, message, source);
	}

	/**
	 * Logs a trace-level message (most verbose, for detailed debugging)
	 */
	static trace(message: string, source?: string): void {
		this.emit(LogLevel.TRACE, message, source);
	}

	/**
	 * Logs a debug-level message (for debugging information)
	 */
	static debug(message: string, source?: string): void {
		this.emit(LogLevel.DEBUG, message, source);
	}

	/**
	 * Logs an info-level message (general information)
	 */
	static info(message: string, source?: string): void {
		this.emit(LogLevel.INFO, message, source);
	}

	/**
	 * Logs a warning-level message (potential issues)
	 */
	static warning(message: string, source?: string): void {
		this.emit(LogLevel.WARNING, message, source);
	}

	/**
	 * Logs an error-level message (errors that don't stop execution)
	 */
	static error(message: string, source?: string): void {
		this.emit(LogLevel.ERROR, message, source);
	}

	/**
	 * Logs a fatal-level message (critical errors)
	 */
	static fatal(message: string, source?: string): void {
		this.emit(LogLevel.FATAL, message, source);
	}
}

// Export default instance for convenience
export default Logger;