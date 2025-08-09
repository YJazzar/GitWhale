import Logger from "@/utils/logger";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { Terminal } from "@xterm/xterm";
import { CleanupTerminalSession, OnTerminalSessionWasResized, InitNewTerminalSession } from "wailsjs/go/backend/App";
import { command_utils } from "wailsjs/go/models";
import { EventsOff, EventsOn, EventsEmit } from "wailsjs/runtime/runtime";


// Map color schemes to xterm themes
export function getXTermTheme(colorScheme: string) {
	switch (colorScheme) {
		case 'dark':
			return {
				background: '#1e1e1e',
				foreground: '#d4d4d4',
				cursor: 'transparent', // Hidden cursor
			};
		case 'light':
			return {
				background: '#ffffff',
				foreground: '#000000',
				cursor: 'transparent',
			};
		case 'solarized':
			return {
				background: '#002b36',
				foreground: '#839496',
				cursor: 'transparent',
			};
		case 'monokai':
			return {
				background: '#272822',
				foreground: '#f8f8f2',
				cursor: 'transparent',
			};
		case 'tomorrow':
			return {
				background: '#1d1f21',
				foreground: '#c5c8c6',
				cursor: 'transparent',
			};
		default:
			return undefined; // Use default xterm theme
	}
}

const xTermRefMap = new Map<
	string,
	{
		terminal: Terminal;
		fitAddon: FitAddon;
		element: HTMLDivElement;
		isDisposed: boolean;
	}
>();

export function getTerminalState(repoPath: string) {
	const createTerminal = (terminalSettings?: command_utils.TerminalSettings) => {
		const fitAddon = new FitAddon();

		// Use provided terminal settings or defaults
		let terminalOptions: any = {};
		if (terminalSettings) {
			terminalOptions = {
				fontSize: terminalSettings.fontSize,
				cursorStyle: terminalSettings.cursorStyle,
				// Map color schemes to xterm themes
				theme: getXTermTheme(terminalSettings.colorScheme),
			};
		} else {
			// Use defaults
			terminalOptions = {
				fontSize: 14,
				cursorStyle: 'block',
			};
		}

		const newTerminal = new Terminal(terminalOptions);
		const element = document.createElement('div');
		element.className = 'w-full h-full';

		newTerminal.loadAddon(fitAddon);
		newTerminal.loadAddon(new SearchAddon());

		// Dispose existing terminal if it exists (prevents memory leaks)
		const existingTerminal = xTermRefMap.get(repoPath);
		if (existingTerminal && !existingTerminal.isDisposed) {
			Logger.debug('Disposing existing terminal before creating new one', 'use-repo-state');
			existingTerminal.terminal.dispose();
			EventsOff(`onTerminalDataReturned://${repoPath}`);
		}

		xTermRefMap.set(repoPath, { terminal: newTerminal, fitAddon, element, isDisposed: false });

		setupTerminalEvents(repoPath, newTerminal);

		// First (and only) time we ever call open():
		newTerminal.open(element);

		return { terminal: newTerminal, fitAddon, element, isDisposed: false };
	};

	const disposeTerminal = () => {
		const terminalData = xTermRefMap.get(repoPath);
		if (!terminalData || terminalData.isDisposed) {
			Logger.debug(
				"Terminal already disposed or doesn't exist for repo: " + repoPath,
				'use-repo-state'
			);
			return;
		}

		Logger.debug('Disposing terminal for repo: ' + repoPath, 'use-repo-state');

		// Mark as disposed first to prevent double disposal
		terminalData.isDisposed = true;

		// Clean up terminal resources
		terminalData.terminal.dispose();

		// Clean up event listeners
		EventsOff(`onTerminalDataReturned://${repoPath}`);

		// Clean up backend terminal session
		CleanupTerminalSession(repoPath).catch((err) =>
			Logger.warning(
				`Failed to cleanup backend terminal session for ${repoPath}: ${err}`,
				'use-repo-state'
			)
		);

		// Remove from map to free memory
		xTermRefMap.delete(repoPath);
	};

	const getTerminalState = () => {
		const terminalData = xTermRefMap.get(repoPath);
		// Return undefined if terminal is disposed to prevent usage of stale references
		return terminalData && !terminalData.isDisposed ? terminalData : undefined;
	};

	return { createTerminal, disposeTerminal, getTerminalState };
}

async function setupTerminalEvents(repoPath: string, terminal: Terminal) {
	// Subscribe to new stuff getting written from the terminal
	// Check if terminal is still alive before writing to prevent errors
	EventsOn(`onTerminalDataReturned://${repoPath}`, (event: string) => {
		const terminalData = xTermRefMap.get(repoPath);
		if (!terminalData || terminalData.isDisposed) {
			Logger.warning('Received terminal data for disposed terminal: ' + repoPath, 'use-repo-state');
			return;
		}

		try {
			const stringData = atob(event);
			terminal.write(stringData);
			terminal.scrollToBottom();
		} catch (error) {
			Logger.error(`Error writing to terminal for repo ${repoPath}: ${error}`, 'use-repo-state');
		}
	});

	terminal.onResize((newSize) => {
		const terminalData = xTermRefMap.get(repoPath);
		if (!terminalData || terminalData.isDisposed) {
			return;
		}
		OnTerminalSessionWasResized(repoPath, { cols: newSize.cols, rows: newSize.rows });
	});

	terminal.onData((event) => {
		const terminalData = xTermRefMap.get(repoPath);
		if (!terminalData || terminalData.isDisposed) {
			return;
		}
		Logger.trace(`Terminal input data: ${event}`, 'use-repo-state');
		EventsEmit(`onTerminalData://${repoPath}`, event);
	});

	try {
		await InitNewTerminalSession(repoPath);
		terminal.write('\n');
	} catch (error) {
		Logger.error(
			`Failed to initialize terminal session for repo ${repoPath}: ${error}`,
			'use-repo-state'
		);
	}
}
