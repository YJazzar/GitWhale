import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import {
	CleanupTerminalSession,
	InitNewTerminalSession,
	OnTerminalSessionWasResized,
} from '../../../wailsjs/go/backend/App';
import { EventsEmit, EventsOff, EventsOn } from '@/../wailsjs/runtime/runtime';
import { backend } from '../../../wailsjs/go/models';

// Map color schemes to xterm themes
function getXTermTheme(colorScheme: string) {
	switch (colorScheme) {
		case 'dark':
			return {
				background: '#1e1e1e',
				foreground: '#d4d4d4',
				cursor: '#ffffff',
			};
		case 'light':
			return {
				background: '#ffffff',
				foreground: '#000000',
				cursor: '#000000',
			};
		case 'solarized':
			return {
				background: '#002b36',
				foreground: '#839496',
				cursor: '#93a1a1',
			};
		case 'monokai':
			return {
				background: '#272822',
				foreground: '#f8f8f2',
				cursor: '#f8f8f0',
			};
		case 'tomorrow':
			return {
				background: '#1d1f21',
				foreground: '#c5c8c6',
				cursor: '#aeafad',
			};
		default:
			return undefined; // Use default xterm theme
	}
}

export const useRepoState = (repoPath: string) => {
	return {
		terminalState: getTerminalState(repoPath),
	};
};

// MARK: Terminal related state. A bit special because we actually want
// the data to NOT cause re-renders

const xTermRefMap = new Map<string, { 
	terminal: Terminal; 
	fitAddon: FitAddon; 
	element: HTMLDivElement;
	isDisposed: boolean;
}>();

// Cleanup helper for disposing all terminals (useful for app shutdown)
export const disposeAllTerminals = () => {
	console.log('Disposing all terminals, total count:', xTermRefMap.size);
	for (const [repoPath, terminalData] of xTermRefMap.entries()) {
		if (!terminalData.isDisposed) {
			console.log('Force disposing terminal for repo:', repoPath);
			terminalData.terminal.dispose();
			EventsOff(`onTerminalDataReturned://${repoPath}`);
			CleanupTerminalSession(repoPath).catch(err => 
				console.warn('Failed to cleanup terminal session for', repoPath, err)
			);
		}
	}
	xTermRefMap.clear();
};

function getTerminalState(repoPath: string) {
	const createTerminal = (terminalSettings?: backend.TerminalSettings) => {
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
		
		// Dispose existing terminal if it exists (prevents memory leaks)
		const existingTerminal = xTermRefMap.get(repoPath);
		if (existingTerminal && !existingTerminal.isDisposed) {
			console.log('Disposing existing terminal before creating new one for:', repoPath);
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
			console.log("Terminal already disposed or doesn't exist for repo:", repoPath);
			return;
		}

		console.log("Disposing terminal for repo:", repoPath);
		
		// Mark as disposed first to prevent double disposal
		terminalData.isDisposed = true;
		
		// Clean up terminal resources
		terminalData.terminal.dispose();
		
		// Clean up event listeners
		EventsOff(`onTerminalDataReturned://${repoPath}`);
		
		// Clean up backend terminal session
		CleanupTerminalSession(repoPath).catch(err => 
			console.warn('Failed to cleanup backend terminal session for', repoPath, err)
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
			console.warn('Received terminal data for disposed terminal:', repoPath);
			return;
		}

		try {
			const stringData = atob(event);
			terminal.write(stringData);
			terminal.scrollToBottom();
		} catch (error) {
			console.error('Error writing to terminal for repo', repoPath, error);
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
		console.log(event);
		EventsEmit(`onTerminalData://${repoPath}`, event);
	});

	try {
		await InitNewTerminalSession(repoPath);
		terminal.write('\n');
	} catch (error) {
		console.error('Failed to initialize terminal session for repo', repoPath, error);
	}
}