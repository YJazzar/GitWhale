import { Terminal } from '@xterm/xterm';
import { useEffect, useRef, useState } from 'react';
import '@xterm/xterm/css/xterm.css';
import { EventsEmit, EventsOff, EventsOn } from '@/../wailsjs/runtime/runtime';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';
import {
	CleanupTerminalSession,
	InitNewTerminalSession,
	OnTerminalSessionWasResized,
} from '../../wailsjs/go/backend/App';
import { FitAddon } from '@xterm/addon-fit';
import { useResizeObserver } from '@/hooks/use-resize-observer';

export default function XTermWrapper() {
	const { encodedRepoPath, repoPath } = useCurrentRepoParams();
	const terminalRef = useRef<{ terminal: Terminal; fitAddon: FitAddon } | undefined>(undefined);
	const divNodeRef = useRef(null);

	const initTerminal = async () => {
		if (!!terminalRef.current || !divNodeRef.current) {
			return;
		}

		const fitAddon = new FitAddon();
		const newTerminal = new Terminal();

		// Store refs for later use
		terminalRef.current = {
			terminal: newTerminal,
			fitAddon: fitAddon,
		};

		newTerminal.loadAddon(fitAddon);
		newTerminal.open(divNodeRef.current);

		// Subscribe to new stuff getting written from the terminal
		EventsOn(`onTerminalDataReturned://${repoPath}`, (event: string) => {
			const byteData = base64ToByteArray(event);
			console.debug('got data: ', byteData);
			newTerminal.write(byteData);
			newTerminal.scrollToBottom();
		});

		newTerminal.onResize((newSize) => {
			OnTerminalSessionWasResized(repoPath, { cols: newSize.cols, rows: newSize.rows });
		});

		newTerminal.onData((event) => {
			console.log(event);
			EventsEmit(`onTerminalData://${repoPath}`, event);
		});

		await InitNewTerminalSession(repoPath);

		fitAddon.fit();

		newTerminal.write('\n');
	};

	const cleanupTerminal = () => {
		const currentTerminal = terminalRef.current?.terminal;
		if (!currentTerminal) {
			return;
		}

		currentTerminal.dispose();
		EventsOff(`onTerminalDataReturned://${repoPath}`);
		CleanupTerminalSession(repoPath);
		terminalRef.current = undefined;
	};

	useEffect(() => {
		initTerminal();
		return cleanupTerminal;
	}, []);

	
	useResizeObserver(divNodeRef, () => {
		terminalRef.current?.fitAddon.fit()
	});

	return <div className="w-full h-full" ref={divNodeRef}></div>;
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
