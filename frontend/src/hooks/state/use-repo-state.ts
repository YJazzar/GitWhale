import { EventsEmit, EventsOff, EventsOn } from '@/../wailsjs/runtime/runtime';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { atom, useAtom } from 'jotai';
import {
	CleanupTerminalSession,
	InitNewTerminalSession,
	OnTerminalSessionWasResized,
} from '../../../wailsjs/go/backend/App';
import { backend } from '../../../wailsjs/go/models';
import { Logger } from '../../utils/logger';
import { useFileManagerStatesCleanup } from './use-file-manager-state';

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

export const useRepoState = (repoPath: string) => {
	const stateObjects = {
		terminalState: getTerminalState(repoPath),
		diffState: getDiffState(repoPath),
		logState: getLogState(repoPath),
	};

	const onCloseRepo = () => {
		stateObjects.terminalState.disposeTerminal();
		stateObjects.diffState.disposeSessions();
		stateObjects.logState.disposeLogState();
	};

	return {
		...stateObjects,
		onCloseRepo,
	};
};

// MARK: Terminal related state. A bit special because we actually want
// the data to NOT cause re-renders

const xTermRefMap = new Map<
	string,
	{
		terminal: Terminal;
		fitAddon: FitAddon;
		element: HTMLDivElement;
		isDisposed: boolean;
	}
>();

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

// MARK: Diff-related state management using Jotai atoms

// Store diff sessions per repository path
const diffSessionsAtom = atom<Map<string, backend.DiffSession[]>>(new Map());

// Store selected session ID per repository path
const selectedDiffSessionAtom = atom<Map<string, string | null>>(new Map());

// Store file info mapping for directory diffs per repository path
const fileInfoMapAtom = atom<Map<string, Map<string, backend.FileInfo>>>(new Map());

// Store diff options/configuration per repository path
const diffOptionsAtom = atom<
	Map<
		string,
		{
			fromRef: string;
			toRef: string;
			showAdvanced: boolean;
			filePathFilters: string;
		}
	>
>(new Map());

// MARK: Diff state management functions

function getDiffState(repoPath: string) {
	const [diffSessions, setDiffSessions] = useAtom(diffSessionsAtom);
	const [selectedSessions, setSelectedSessions] = useAtom(selectedDiffSessionAtom);
	const [fileInfoMaps, setFileInfoMaps] = useAtom(fileInfoMapAtom);
	const [diffOptions, setDiffOptionsMap] = useAtom(diffOptionsAtom);

	// Get selected session ID for this repo
	const repoDiffSessions = diffSessions.get(repoPath)
	const selectedSessionId = selectedSessions.get(repoPath) || null;
	const selectedSession = repoDiffSessions?.find((s) => s.sessionId === selectedSessionId);

	const repoDiffSessionIds = repoDiffSessions?.map(session => session.sessionId) ?? []
	const { cleanupFileManagerStates } = useFileManagerStatesCleanup(repoDiffSessionIds);

	return {
		// Get current sessions for this repo
		sessions: diffSessions.get(repoPath) || [],

		// Update sessions for this repo
		setSessions: (sessions: backend.DiffSession[]) => {
			const newMap = new Map(diffSessions);
			newMap.set(repoPath, sessions);
			setDiffSessions(newMap);
		},

		selectedSessionId,
		selectedSession,

		// Set selected session ID for this repo
		setSelectedSessionId: (sessionId: string | null) => {
			const newMap = new Map(selectedSessions);
			newMap.set(repoPath, sessionId);
			setSelectedSessions(newMap);
		},

		// Get file info map for this repo
		fileInfoMap: fileInfoMaps.get(repoPath),

		// Set file info map for this repo
		setFileInfoMap: (fileInfoMap: Map<string, backend.FileInfo>) => {
			const newMap = new Map(fileInfoMaps);
			newMap.set(repoPath, fileInfoMap);
			setFileInfoMaps(newMap);
		},

		// Get diff options for this repo
		options: diffOptions.get(repoPath) || {
			fromRef: 'HEAD',
			toRef: '',
			showAdvanced: false,
			filePathFilters: '',
		},

		// Set diff options for this repo
		setOptions: (options: {
			fromRef: string;
			toRef: string;
			showAdvanced: boolean;
			filePathFilters: string;
		}) => {
			const newMap = new Map(diffOptions);
			newMap.set(repoPath, options);
			setDiffOptionsMap(newMap);
		},

		// Clear all diff state for this repo
		disposeSessions: () => {
			const newSessionsMap = new Map(diffSessions);
			newSessionsMap.delete(repoPath);
			setDiffSessions(newSessionsMap);

			const newSelectedMap = new Map(selectedSessions);
			newSelectedMap.delete(repoPath);
			setSelectedSessions(newSelectedMap);

			const newFileInfoMap = new Map(fileInfoMaps);
			newFileInfoMap.delete(repoPath);
			setFileInfoMaps(newFileInfoMap);

			const newOptionsMap = new Map(diffOptions);
			newOptionsMap.delete(repoPath);
			setDiffOptionsMap(newOptionsMap);

			cleanupFileManagerStates()
		},
	};
}

// MARK: Git log-related state management using Jotai atoms

// Store git log data per repository path
const gitLogDataAtom = atom<Map<string, backend.GitLogCommitInfo[]>>(new Map());

// Store selected commit for details panel per repository path
const selectedCommitAtom = atom<Map<string, backend.GitLogCommitInfo | null>>(new Map());

// Store current reference (HEAD, branch, tag) per repository path
const currentRefAtom = atom<Map<string, string>>(new Map());

// Store git refs (branches and tags) per repository path
const gitRefsAtom = atom<Map<string, { branches: backend.GitRef[]; tags: backend.GitRef[] }>>(new Map());

// Store git log options/filters per repository path
const gitLogOptionsAtom = atom<
	Map<
		string,
		{
			searchQuery: string;
			commitCount: number;
			includeMerges: boolean;
			fromRef: string;
			toRef: string;
			fetchRemote: string;
			fetchRef: string;
		}
	>
>(new Map());

// MARK: Git log state management functions

function getLogState(repoPath: string) {
	const [logData, setLogData] = useAtom(gitLogDataAtom);
	const [selectedCommits, setSelectedCommits] = useAtom(selectedCommitAtom);
	const [currentRefs, setCurrentRefs] = useAtom(currentRefAtom);
	const [gitRefs, setGitRefs] = useAtom(gitRefsAtom);
	const [logOptions, setLogOptionsMap] = useAtom(gitLogOptionsAtom);

	return {
		// Get git log data for this repo
		logs: logData.get(repoPath) || [],

		// Set git log data for this repo
		setLogs: (logs: backend.GitLogCommitInfo[]) => {
			const newMap = new Map(logData);
			newMap.set(repoPath, logs);
			setLogData(newMap);
		},

		// Get selected commit for this repo
		selectedCommit: selectedCommits.get(repoPath) || null,

		// Set selected commit for this repo
		setSelectedCommit: (commit: backend.GitLogCommitInfo | null) => {
			const newMap = new Map(selectedCommits);
			newMap.set(repoPath, commit);
			setSelectedCommits(newMap);
		},

		// Get current ref for this repo
		currentRef: currentRefs.get(repoPath) || 'HEAD',

		// Set current ref for this repo
		setCurrentRef: (ref: string) => {
			const newMap = new Map(currentRefs);
			newMap.set(repoPath, ref);
			setCurrentRefs(newMap);
		},

		// Get git refs (branches/tags) for this repo
		refs: gitRefs.get(repoPath) || { branches: [], tags: [] },

		// Set git refs for this repo
		setRefs: (refs: { branches: backend.GitRef[]; tags: backend.GitRef[] }) => {
			const newMap = new Map(gitRefs);
			newMap.set(repoPath, refs);
			setGitRefs(newMap);
		},

		// Get log options for this repo
		options: logOptions.get(repoPath) || {
			searchQuery: '',
			commitCount: 100,
			includeMerges: true,
			fromRef: '',
			toRef: '',
			fetchRemote: 'origin',
			fetchRef: '',
		},

		// Set log options for this repo
		setOptions: (options: {
			searchQuery: string;
			commitCount: number;
			includeMerges: boolean;
			fromRef: string;
			toRef: string;
			fetchRemote: string;
			fetchRef: string;
		}) => {
			const newMap = new Map(logOptions);
			newMap.set(repoPath, options);
			setLogOptionsMap(newMap);
		},

		// Clear all log state for this repo
		disposeLogState: () => {
			const newLogDataMap = new Map(logData);
			newLogDataMap.delete(repoPath);
			setLogData(newLogDataMap);

			const newSelectedMap = new Map(selectedCommits);
			newSelectedMap.delete(repoPath);
			setSelectedCommits(newSelectedMap);

			const newRefsMap = new Map(currentRefs);
			newRefsMap.delete(repoPath);
			setCurrentRefs(newRefsMap);

			const newGitRefsMap = new Map(gitRefs);
			newGitRefsMap.delete(repoPath);
			setGitRefs(newGitRefsMap);

			const newOptionsMap = new Map(logOptions);
			newOptionsMap.delete(repoPath);
			setLogOptionsMap(newOptionsMap);
		},
	};
}
