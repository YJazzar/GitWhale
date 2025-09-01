import { useRepoTerminalState } from '@/hooks/state/repo/use-repo-terminal';
import { UseAppState } from '@/hooks/state/use-app-state';
import { useResizeObserver } from '@/hooks/utils/use-resize-observer';
import '@xterm/xterm/css/xterm.css';
import { useCallback, useLayoutEffect, useRef } from 'react';

export default function XTermWrapper(props: { repoPath: string }) {
	const { repoPath } = props;
	const { appState } = UseAppState();
	const divNodeRef = useRef<HTMLDivElement | null>(null);

	// This will not cause a re-render and we can treat it like a ref
	const { getTerminalState, createTerminal } = useRepoTerminalState(repoPath);

	useLayoutEffect(() => {
		let state = getTerminalState();

		// first visit for this repo
		if (!state) {
			// Get terminal settings from app state
			const terminalSettings = appState?.appConfig?.settings?.terminal;
			state = createTerminal(terminalSettings);
		}

		// ① put (or move) the DOM node into place
		if (divNodeRef.current && state && state.element.parentNode !== divNodeRef.current) {
			divNodeRef.current.appendChild(state.element);
			state.fitAddon.fit(); // make it fill the new box
		}

		if (state) {
			state.fitAddon.fit();
		}

		// ② detach—**don't dispose**—on unmount so scroll back & PID survive
		return () => {
			state?.element.parentNode?.removeChild(state.element);
		};
	}, []);

	useResizeObserver(
		divNodeRef as unknown as React.MutableRefObject<null>,
		useCallback(() => {
			const fitAddon = getTerminalState()?.fitAddon;
			fitAddon?.fit();
		}, [getTerminalState])
	);

	return <div className="w-full h-full" ref={divNodeRef}></div>;
}
