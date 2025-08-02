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

const xTermRefMap = new Map<string, { terminal: Terminal; fitAddon: FitAddon; element: HTMLDivElement }>();
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
		xTermRefMap.set(repoPath, { terminal: newTerminal, fitAddon, element });

		setupTerminalEvents(repoPath, newTerminal);

		// First (and only) time we ever call open():
		newTerminal.open(element);

		return { terminal: newTerminal, fitAddon, element };
	};

	const disposeTerminal = () => {
		const { terminal } = xTermRefMap.get(repoPath) || {};
		if (!terminal) {
			return;
		}

		console.log("disposing terminal for repo: ", repoPath);
		terminal.dispose();
		EventsOff(`onTerminalDataReturned://${repoPath}`);
		CleanupTerminalSession(repoPath);
		xTermRefMap.delete(repoPath);
	};


	const getTerminalState = () => {
		return xTermRefMap.get(repoPath);
	};

	return { createTerminal, disposeTerminal, getTerminalState };
}

async function setupTerminalEvents(repoPath: string, terminal: Terminal) {
	// Subscribe to new stuff getting written from the terminal
	EventsOn(`onTerminalDataReturned://${repoPath}`, (event: string) => {
		const stringData = atob(event)

		terminal.write(stringData);
		terminal.scrollToBottom();
	});

	terminal.onResize((newSize) => {
		OnTerminalSessionWasResized(repoPath, { cols: newSize.cols, rows: newSize.rows });
	});

	terminal.onData((event) => {
		console.log(event);
		EventsEmit(`onTerminalData://${repoPath}`, event);
	});

	await InitNewTerminalSession(repoPath);

	terminal.write('\n')
}