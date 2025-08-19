import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { Terminal } from '@xterm/xterm';
import { atom, useAtom } from 'jotai';
import { ClearApplicationLogHistory, GetApplicationLogHistory } from '../../../wailsjs/go/backend/App';
import { command_utils, logger } from '../../../wailsjs/go/models';
import { EventsOff, EventsOn } from '../../../wailsjs/runtime/runtime';
import { Logger } from '../../utils/logger';
import { getXTermTheme } from './repo/use-repo-terminal';

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

// Log levels in order of severity (matches backend enum order)
export const LOG_LEVELS = ['ALL', 'PRINT', 'TRACE', 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'FATAL'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

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

function formatLogEntry(entry: logger.LogEntry): string {
	const timestamp = new Date(entry.timestamp).toLocaleTimeString();
	const color =
		LOG_LEVEL_COLORS[entry.level.toString() as keyof typeof LOG_LEVEL_COLORS] || LOG_LEVEL_COLORS.PRINT;
	const resetColor = LOG_LEVEL_COLORS.RESET;

	return `${color}[${timestamp}] ${entry.level.toString().padEnd(7)} ${entry.message}${resetColor}`;
}

const filterLevelAtom = atom<LogLevel>('ALL');
const isLoadingAtom = atom<boolean>(false);

function shouldIncludeLogEntry(entry: logger.LogEntry, currentFilterLevel: LogLevel): boolean {
	// Show all entries when ALL is selected
	if (currentFilterLevel === 'ALL') {
		return true;
	}

	// Get severity index for both entry and filter
	const entryIndex = LOG_LEVELS.indexOf(entry.level as LogLevel);
	const filterIndex = LOG_LEVELS.indexOf(currentFilterLevel);

	// If entry level is not found, show it by default
	if (entryIndex === -1) {
		return true;
	}

	// Show entries at or above the filter level (higher indices are more severe)
	return entryIndex >= filterIndex;
}

export const useAppLogState = () => {
	const [filterLevel, setFilterLevel] = useAtom(filterLevelAtom);
	const [isLoading, setIsLoading] = useAtom(isLoadingAtom);

	const createLogTerminal = (terminalSettings?: command_utils.TerminalSettings) => {
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
		newTerminal.loadAddon(new SearchAddon());

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

	const appendLogEntry = (entry: logger.LogEntry) => {
		const terminalData = getLogTerminalState();
		if (!terminalData) {
			Logger.warning('No log terminal available to append entry', 'use-log-state');
			return;
		}

		appendLogEntryInner(entry, filterLevel,terminalData.terminal)
	};

	const appendLogEntryInner = (
		entry: logger.LogEntry,
		currentFilterLevel: LogLevel,
		terminal: Terminal
	) => {
		if (!shouldIncludeLogEntry(entry, currentFilterLevel)) {
			return;
		}

		const formattedEntry = formatLogEntry(entry) + '\r\n';
		terminal.write(formattedEntry);
		terminal.scrollToBottom();
	};

	const loadInitialLogs = async () => {
		setIsLoading(true);
		try {
			const entries = await GetApplicationLogHistory();
			entries.forEach((entry: logger.LogEntry) => {
				appendLogEntry(entry);
			});
		} catch (error) {
			Logger.error(`Failed to load log history: ${error}`, 'use-log-state');
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

		const typedLevel = newFilter as LogLevel;
		setFilterLevel(typedLevel);

		// Reload logs with new filter
		terminalData.terminal.clear();
		const entries = await GetApplicationLogHistory();
		entries.forEach((entry: logger.LogEntry) => {
			appendLogEntryInner(entry, typedLevel, terminalData.terminal);
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

export function useAppLogStateAtoms() {
	return {
		filterLevelAtom, 
		isLoadingAtom,
	}
}