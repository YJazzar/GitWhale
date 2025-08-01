import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import {
	CleanupTerminalSession,
	InitNewTerminalSession,
	OnTerminalSessionWasResized,
} from '../../../wailsjs/go/backend/App';
import { EventsEmit, EventsOff, EventsOn } from '@/../wailsjs/runtime/runtime';

export const useRepoState = (repoPath: string) => {
	return {
		terminalState: getTerminalState(repoPath),
	};
};

// MARK: Terminal related state. A bit special because we actually want
// the data to NOT cause re-renders

const xTermRefState = new Map<string, { terminal: Terminal; fitAddon: FitAddon; element: HTMLDivElement }>();
function getTerminalState(repoPath: string) {
	const { terminal, fitAddon } = xTermRefState.get(repoPath) || {};

	const createTerminal = () => {
		const fitAddon = new FitAddon();
		const newTerminal = new Terminal({ cursorBlink: true, cursorStyle: 'bar' });
		const element = document.createElement('div');
		element.className = 'w-full h-full';

		newTerminal.loadAddon(fitAddon);
		xTermRefState.set(repoPath, { terminal: newTerminal, fitAddon, element });

		setupTerminalEvents(repoPath, newTerminal);

		// First (and only) time we ever call open():
		newTerminal.open(element);

		return { terminal: newTerminal, fitAddon, element };
	};


	const unregisterTerminal = () => {
		xTermRefState.delete(repoPath);
	};

	const getTerminalState = () => {
		return xTermRefState.get(repoPath);
	};

	return { createTerminal, unregisterTerminal, getTerminalState };
}

async function setupTerminalEvents(repoPath: string, terminal: Terminal) {
	// Subscribe to new stuff getting written from the terminal
	EventsOn(`onTerminalDataReturned://${repoPath}`, (event: string) => {
		const byteData = base64ToByteArray(event);
		// console.debug('got data: ', byteData);
		terminal.write(byteData);
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
}

function disposeTerminal(repoPath: string) {

		// const cleanupTerminal = () => {
		// 	const currentTerminal = terminal.getTerminalState()?.terminal;
		// 	if (!currentTerminal) {
		// 		return;
		// 	}
	
		// 	currentTerminal?.dispose();
		// 	EventsOff(`onTerminalDataReturned://${repoPath}`);
		// 	CleanupTerminalSession(repoPath);
		// 	terminal.unregisterTerminal();
		// };
}


function base64ToByteArray(base64: string) {
	// Decode the base64 string into an ASCII string
	const decodedString = atob(base64);

	// Create an array to hold the byte values
	const byteArray = new Uint8Array(decodedString.length);

	// Loop through each character and convert it to a byte
	for (let i = 0; i < decodedString.length; i++) {
		byteArray[i] = decodedString.charCodeAt(i);
	}

	return byteArray;
}
