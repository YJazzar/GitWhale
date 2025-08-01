import { useRepoState } from '@/hooks/state/use-repo-state';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';
import { useResizeObserver } from '@/hooks/use-resize-observer';
import '@xterm/xterm/css/xterm.css';
import { useLayoutEffect, useRef } from 'react';

export default function XTermWrapper() {
	const { repoPath } = useCurrentRepoParams();
	const divNodeRef = useRef<HTMLDivElement | null>(null);

	// This will not cause a re-render and we can treat it like a ref
	const { terminalState } = useRepoState(repoPath);

	useLayoutEffect(() => {
		let state = terminalState.getTerminalState();

		// first visit for this repo
		if (!state) {
			state = terminalState.createTerminal();
		}

		// ① put (or move) the DOM node into place
		if (divNodeRef.current && state.element.parentNode !== divNodeRef.current) {
			divNodeRef.current.appendChild(state.element);
			state.fitAddon.fit(); // make it fill the new box
		}

		state.fitAddon.fit();

		// ② detach—**don’t dispose**—on unmount so scroll back & PID survive
		return () => {
			state?.element.parentNode?.removeChild(state.element);
		};
	}, [repoPath]);


	useResizeObserver(divNodeRef as unknown as React.MutableRefObject<null>, () => {
		const fitAddon = terminalState.getTerminalState()?.fitAddon;
		fitAddon?.fit();
	});

	return (
		<div className="w-full h-full" ref={divNodeRef}>
		</div>
	);
}
