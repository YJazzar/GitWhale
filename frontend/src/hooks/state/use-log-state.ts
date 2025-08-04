import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { backend } from '../../../wailsjs/go/models';
import { getXTermTheme } from './use-repo-state';
import { EventsOff, EventsOn } from '../../../wailsjs/runtime/runtime';
import { atom, useAtom } from 'jotai';
import { ClearApplicationLogHistory, GetApplicationLogHistory } from '../../../wailsjs/go/backend/App';

// Map for persistent log terminals - similar to xTermRefMap pattern
const logTerminalMap = new Map<
	string,
	{
		terminal: Terminal;
		fitAddon: FitAddon;
		element: HTMLDivElement;
		isDisposed: boolean;
	}
>();

export enum LogLevel {
	ALL,
	TRACE,
	DEBUG,
	INFO,
	PRINT,
	WARNING,
	ERROR,
	FATAL,
}

// Get all keys (names) of the enum
export const LOG_LEVEL_ENUM_KEYS: string[] = Object.keys(LogLevel).filter((key) => isNaN(Number(key)));

// Color mapping for different log levels
const LOG_LEVEL_COLORS = {
	ERROR: '\x1b[31m', // Red
	FATAL: '\x1b[35m', // Magenta
	WARNING: '\x1b[33m', // Yellow
	INFO: '\x1b[36m', // Cyan
	DEBUG: '\x1b[37m', // White
	TRACE: '\x1b[90m', // Dark gray
	PRINT: '\x1b[0m', // Default
	RESET: '\x1b[0m', // Reset color
};

function formatLogEntry(entry: backend.LogEntry): string {
	const timestamp = new Date(entry.timestamp).toLocaleTimeString();
	const color =
		LOG_LEVEL_COLORS[entry.level.toString() as keyof typeof LOG_LEVEL_COLORS] || LOG_LEVEL_COLORS.PRINT;
	const resetColor = LOG_LEVEL_COLORS.RESET;

	return `${color}[${timestamp}] ${entry.level.toString().padEnd(7)}${resetColor} ${entry.message}`;
}

const filterLevelAtom = atom<LogLevel>(LogLevel.ALL);
const isLoadingAtom = atom<boolean>(false);

function shouldIncludeLogEntry(entry: backend.LogEntry, currentFilterLevel: LogLevel): boolean {
	return LogLevel[entry.level as keyof typeof LogLevel] >= currentFilterLevel;
}

export const useAppLogState = () => {
	const [filterLevel, setFilterLevel] = useAtom(filterLevelAtom);
	const [isLoading, setIsLoading] = useAtom(isLoadingAtom);

	const createLogTerminal = (terminalSettings?: backend.TerminalSettings) => {
		const terminalKey = 'application-logs';
		const existingTerminal = logTerminalMap.get(terminalKey);

		// Dispose existing terminal if it exists
		if (existingTerminal && !existingTerminal.isDisposed) {
			return existingTerminal;
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
			isDisposed: false,
		});

		// Subscribe to new log events
		EventsOn('log:entry', appendLogEntry);

		// Load initial log history
		loadInitialLogs();

		return { terminal: newTerminal, fitAddon, element };
	};

	const disposeLogTerminal = () => {
		const terminalKey = 'application-logs';
		const terminalData = logTerminalMap.get(terminalKey);

		if (!terminalData || terminalData.isDisposed) {
			return;
		}

		EventsOff('log:entry');

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

	const appendLogEntry = (entry: backend.LogEntry) => {
		const terminalData = getLogTerminalState();
		if (!terminalData) {
			console.warn('No log terminal available to append entry');
			return;
		}

		if (!shouldIncludeLogEntry(entry, filterLevel)) {
			return;
		}

		const formattedEntry = formatLogEntry(entry) + '\r\n';
		terminalData.terminal.write(formattedEntry);
		terminalData.terminal.scrollToBottom();
	};

	const loadInitialLogs = async () => {
		setIsLoading(true);
		try {
			const entries = await GetApplicationLogHistory();
			entries.forEach((entry: backend.LogEntry) => {
				appendLogEntry(entry);
			});
		} catch (error) {
			console.error('Failed to load log history:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const clearLogs = () => {
		const terminalData = getLogTerminalState();
		if (!terminalData) {
			return;
		}

		ClearApplicationLogHistory();
		terminalData.terminal.clear();
	};

	const fitTerminal = () => {
		const terminalData = getLogTerminalState();
		if (!terminalData) {
			return;
		}

		terminalData.fitAddon.fit();
	};

	const handleLogFilterChange = async (newFilter: string) => {
		const terminalData = getLogTerminalState();
		if (!terminalData) {
			return;
		}

		const typedLevel = LogLevel[newFilter as keyof typeof LogLevel];
		setFilterLevel(typedLevel);

		// Reload logs with new filter
		terminalData.terminal.clear();
		const entries = await GetApplicationLogHistory();
		entries.forEach((entry: backend.LogEntry) => {
			appendLogEntry(entry);
		});
	};

	return {
		isLoading,
		filterLevel: {
			get: () => filterLevel,
			set: handleLogFilterChange,
		},
		createLogTerminal,
		disposeLogTerminal,
		getLogTerminalState,
		appendLogEntry,
		clearLogs,
		fitTerminal,
	};
};
