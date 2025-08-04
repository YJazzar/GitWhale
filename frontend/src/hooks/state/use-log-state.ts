import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { backend } from '../../../wailsjs/go/models';
import { getXTermTheme } from './use-repo-state';

// Map for persistent log terminals - similar to xTermRefMap pattern
const logTerminalMap = new Map<string, {
	terminal: Terminal;
	fitAddon: FitAddon;
	element: HTMLDivElement;
	isDisposed: boolean;
}>();

// Log entry type matching backend LogEntry
export interface LogEntry {
	timestamp: string;
	level: string;
	message: string;
	id: string;
}


export const LOG_LEVELS = ['ALL', 'FATAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG', 'TRACE', 'PRINT'];

// Color mapping for different log levels
const LOG_LEVEL_COLORS = {
	ERROR: '\x1b[31m',   // Red
	FATAL: '\x1b[35m',   // Magenta
	WARNING: '\x1b[33m', // Yellow
	INFO: '\x1b[36m',    // Cyan
	DEBUG: '\x1b[37m',   // White
	TRACE: '\x1b[90m',   // Dark gray
	PRINT: '\x1b[0m',    // Default
	RESET: '\x1b[0m'     // Reset color
};

function formatLogEntry(entry: LogEntry): string {
	const timestamp = new Date(entry.timestamp).toLocaleTimeString();
	const color = LOG_LEVEL_COLORS[entry.level as keyof typeof LOG_LEVEL_COLORS] || LOG_LEVEL_COLORS.PRINT;
	const resetColor = LOG_LEVEL_COLORS.RESET;
	
	return `${color}[${timestamp}] ${entry.level.padEnd(7)}${resetColor} ${entry.message}`;
}

export const useAppLogState = () => {
	const createLogTerminal = (terminalSettings?: backend.TerminalSettings) => {
		const terminalKey = 'application-logs';
		const existingTerminal = logTerminalMap.get(terminalKey);
		
		// Dispose existing terminal if it exists
		if (existingTerminal && !existingTerminal.isDisposed) {
			existingTerminal.terminal.dispose();
		}

		const fitAddon = new FitAddon();
		
		// Use provided terminal settings or defaults optimized for logs
		let terminalOptions: any = {
			fontSize: terminalSettings?.fontSize || 12,
			cursorStyle: 'none', // No cursor for read-only terminal
			disableStdin: true, // Disable input
			convertEol: true,
			scrollback: 10000, // Large scrollback for logs
		};

		// Apply color scheme if provided
		if (terminalSettings?.colorScheme) {
			const theme = getXTermTheme(terminalSettings.colorScheme);
			if (theme) {
				terminalOptions.theme = theme;
			}
		}
		
		const newTerminal = new Terminal(terminalOptions);
		newTerminal.loadAddon(fitAddon);

		// Create container element
		const element = document.createElement('div');
		element.style.width = '100%';
		element.style.height = '100%';
		
		// Open terminal in container
		newTerminal.open(element);
		
		// Store terminal reference
		logTerminalMap.set(terminalKey, {
			terminal: newTerminal,
			fitAddon,
			element,
			isDisposed: false
		});

		return { terminal: newTerminal, fitAddon, element };
	};

	const disposeLogTerminal = () => {
		const terminalKey = 'application-logs';
		const terminalData = logTerminalMap.get(terminalKey);
		
		if (!terminalData || terminalData.isDisposed) {
			return;
		}

		terminalData.isDisposed = true;
		terminalData.terminal.dispose();
		logTerminalMap.delete(terminalKey);
	};

	const getLogTerminalState = () => {
		const terminalKey = 'application-logs';
		const terminalData = logTerminalMap.get(terminalKey);
		
		// Return undefined if terminal is disposed to prevent usage of stale references
		if (!terminalData || terminalData.isDisposed) {
			return undefined;
		}

		return terminalData;
	};

	const appendLogEntry = (entry: LogEntry) => {
		const terminalData = getLogTerminalState();
		if (!terminalData) {
			console.warn('No log terminal available to append entry');
			return;
		}

		const formattedEntry = formatLogEntry(entry) + '\r\n';
		terminalData.terminal.write(formattedEntry);
		
		// Auto-scroll to bottom
		terminalData.terminal.scrollToBottom();
	};

	const clearLogs = () => {
		const terminalData = getLogTerminalState();
		if (!terminalData) {
			return;
		}

		terminalData.terminal.clear();
	};

	const fitTerminal = () => {
		const terminalData = getLogTerminalState();
		if (!terminalData) {
			return;
		}

		terminalData.fitAddon.fit();
	};

	return {
		createLogTerminal,
		disposeLogTerminal,
		getLogTerminalState,
		appendLogEntry,
		clearLogs,
		fitTerminal
	};
};
