import { Terminal } from '@xterm/xterm';
import { useEffect, useRef, useState } from 'react';
import '@xterm/xterm/css/xterm.css';
import { EventsEmit, EventsOff, EventsOn } from '@/../wailsjs/runtime/runtime';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';

export default function XTermWrapper() {
	const { encodedRepoPath, repoPath } = useCurrentRepoParams();
	const [terminal, setTerminal] = useState<Terminal | undefined>(undefined);
	const divNodeRef = useRef(null);

	useEffect(() => {
		if (!!terminal || !divNodeRef.current) {
			return;
		}

		const newTerminal = new Terminal();
		newTerminal.open(divNodeRef.current);

		newTerminal.write('Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ');

		newTerminal.onData((event) => {
			console.log(event);
			EventsEmit(`onTerminalData://${repoPath}`, event);
		});


		// Subscribe to new stuff getting written from the terminal
		EventsOn(`onTerminalDataReturned://${repoPath}`, (event: string | Uint8Array) => {
			newTerminal.write(event);
		});

		return () => {
			EventsOff(`onTerminalDataReturned://${repoPath}`);
		};
	});

	return <div ref={divNodeRef}></div>;
}
