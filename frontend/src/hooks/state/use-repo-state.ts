import { EventsEmit, EventsOff, EventsOn } from '@/../wailsjs/runtime/runtime';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { atom, useAtom } from 'jotai';
import {
	CleanupTerminalSession,
	EndDiffSession,
	GetAllRefs,
	GitFetch,
	InitNewTerminalSession,
	OnTerminalSessionWasResized,
	RunGitLog,
	StartDiffSession,
} from '../../../wailsjs/go/backend/App';
import { backend, command_utils, git_operations } from '../../../wailsjs/go/models';
import { Logger } from '../../utils/logger';
import { useFileManagerStatesCleanup } from './use-file-manager-state';
import { SearchAddon } from '@xterm/addon-search';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../use-toast';

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

// MARK: Diff-related state management using Jotai atoms

// Store diff sessions per repository path
const diffSessionsAtom = atom<Map<string, git_operations.DiffSession[]>>(new Map());

// Store selected session ID per repository path
const selectedDiffSessionAtom = atom<Map<string, string | null>>(new Map());

// Store file info mapping for directory diffs per repository path
const fileInfoMapAtom = atom<Map<string, Map<string, git_operations.FileInfo>>>(new Map());

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

const isLoadingDiffAtom = atom<Map<string, boolean>>(new Map());

// MARK: Diff state management functions

function getDiffState(repoPath: string) {
	const [diffSessionsMap, setDiffSessionsMap] = useAtom(diffSessionsAtom);
	const [selectedSessionIDMap, setSelectedSessionIDMap] = useAtom(selectedDiffSessionAtom);
	const [fileInfoMaps, setFileInfoMaps] = useAtom(fileInfoMapAtom);
	const [diffOptions, setDiffOptionsMap] = useAtom(diffOptionsAtom);
	const [isLoadingMap, setIsLoadingMap] = useAtom(isLoadingGitDataAtom);

	// Get selected session ID for this repo
	const repoDiffSessions = diffSessionsMap.get(repoPath) ?? [];
	const selectedSessionId = selectedSessionIDMap.get(repoPath) || null;
	const selectedSession = repoDiffSessions?.find((s) => s.sessionId === selectedSessionId);

	const repoDiffSessionIds = repoDiffSessions?.map((session) => session.sessionId) ?? [];
	const { cleanupFileManagerStates } = useFileManagerStatesCleanup(repoDiffSessionIds);
	const { toast } = useToast();

	const __setIsLoadingDiffData = (newValue: boolean) => {
		const newMap = new Map(isLoadingMap);
		newMap.set(repoPath, newValue);
		setIsLoadingMap(newMap);
	};

	// Update sessions for this repo
	const __setSessions = (sessions: git_operations.DiffSession[]) => {
		const newMap = new Map(diffSessionsMap);
		newMap.set(repoPath, sessions);
		setDiffSessionsMap(newMap);
	};

	// Set selected session ID for this repo
	const __setSelectedSessionId = (sessionId: string | null) => {
		const newMap = new Map(selectedSessionIDMap);
		newMap.set(repoPath, sessionId);
		setSelectedSessionIDMap(newMap);
	};

	const createSession = async (options: git_operations.DiffOptions) => {
		try {
			__setIsLoadingDiffData(true);

			const session = await StartDiffSession(options);
			const newSessions = [...repoDiffSessions, session];
			Logger.debug(`Received session: ${session.sessionId}`, 'RepoDiffView');

			__setSessions(newSessions);
			__setSelectedSessionId(session.sessionId);
			return session;
		} catch (error) {
			Logger.error(`Failed to create diff session: ${error}`, 'RepoDiffView');
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

			toast({
				variant: 'destructive',
				title: 'Failed to create diff session',
				description: errorMessage,
			});

			return undefined;
		} finally {
			__setIsLoadingDiffData(false);
		}
	};

	const closeSession = async (sessionId: string) => {
		try {
			await EndDiffSession(sessionId);
			const newSessions = repoDiffSessions.filter((s) => s.sessionId !== sessionId);
			__setSessions(newSessions);

			if (selectedSessionId === sessionId) {
				__setSelectedSessionId(newSessions.length > 0 ? newSessions[0].sessionId : null);
			}
		} catch (error) {
			Logger.error(`Failed to close diff session: ${error}`, 'RepoDiffView');
			throw error;
		}
	};

	return {
		isLoading: isLoadingMap.get(repoPath) || false,

		createSession,
		closeSession,

		// Get current sessions for this repo
		sessionData: repoDiffSessions,
		selectedSession: {
			setById: (id: string) => __setSelectedSessionId(id),
			getId: () => selectedSessionId,
			getData: () => selectedSession,
		},

		// Get file info map for this repo
		fileInfoMap: fileInfoMaps.get(repoPath),

		// Set file info map for this repo
		setFileInfoMap: (fileInfoMap: Map<string, git_operations.FileInfo>) => {
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
			const newSessionsMap = new Map(diffSessionsMap);
			newSessionsMap.delete(repoPath);
			setDiffSessionsMap(newSessionsMap);

			const newSelectedMap = new Map(selectedSessionIDMap);
			newSelectedMap.delete(repoPath);
			setSelectedSessionIDMap(newSelectedMap);

			const newFileInfoMap = new Map(fileInfoMaps);
			newFileInfoMap.delete(repoPath);
			setFileInfoMaps(newFileInfoMap);

			const newOptionsMap = new Map(diffOptions);
			newOptionsMap.delete(repoPath);
			setDiffOptionsMap(newOptionsMap);

			cleanupFileManagerStates();
		},
	};
}

// MARK: Git log-related state management using Jotai atoms

// Store git log data per repository path
const gitLogDataAtom = atom<Map<string, git_operations.GitLogCommitInfo[]>>(new Map());

const isLoadingGitDataAtom = atom<Map<string, boolean>>(new Map());

// Store selected commit for details panel per repository path. Key is repoPath, value is commitHash
const selectedCommitAtom = atom<Map<string, string | null>>(new Map());

// Store git log options/filters per repository path
const gitLogOptionsAtom = atom<Map<string, git_operations.GitLogOptions>>(new Map());

// Store git refs (branches and tags) per repository path
const gitRefsAtom = atom<Map<string, git_operations.GitRef[]>>(new Map());

// MARK: Git log state management functions

function getLogState(repoPath: string) {
	const [logData, setLogData] = useAtom(gitLogDataAtom);
	const [isLoadingMap, setIsLoadingMap] = useAtom(isLoadingGitDataAtom);
	const [selectedCommits, setSelectedCommits] = useAtom(selectedCommitAtom);
	const [gitRefs, setGitRefs] = useAtom(gitRefsAtom);
	const [logOptionsMap, setLogOptionsMap] = useAtom(gitLogOptionsAtom);

	const [needsToReload, setNeedsToReload] = useState(false)

	const isLoading = isLoadingMap.get(repoPath) || false
	const setIsLoadingGitData = (newValue: boolean) => {
		const newMap = new Map(isLoadingMap);
		newMap.set(repoPath, newValue);
		setIsLoadingMap(newMap);
	};

	// When a user clicks to open a commit (the quick view kind that's embedded in the git-log-view)
	const setSelectedCommit = (commitHash: string | null) => {
		const newMap = new Map(selectedCommits);
		newMap.set(repoPath, commitHash);
		setSelectedCommits(newMap);
	};

	const currentLogOptions = logOptionsMap.get(repoPath) || {
		author: undefined,
		commitsToLoad: undefined,
		fromRef: undefined,
		searchQuery: undefined,
		toRef: undefined,
	};

	const setLogViewOptions = (options: git_operations.GitLogOptions) => {
		const newMap = new Map(logOptionsMap);
		newMap.set(repoPath, options);
		setLogOptionsMap(newMap);
	};

	const refreshLogsInner = async (options: git_operations.GitLogOptions) => {
		const newLogs = await RunGitLog(repoPath, options);

		const newMap = new Map(logData);
		newMap.set(repoPath, newLogs);
		setLogData(newMap);
	};

	const loadAllRefsInner = async () => {
		const newRefs = await GetAllRefs(repoPath);

		const newMap = new Map(gitRefs);
		newMap.set(repoPath, newRefs);
		setGitRefs(newMap);
	};

	const refreshLogAndRefs = async () => {
		if (isLoading) { 
			return
		}

		try {
			setIsLoadingGitData(true);

			await Promise.all([loadAllRefsInner(), refreshLogsInner(currentLogOptions)]);
		} catch (error) {
			Logger.error(`Failed to reload refs: ${error}`, 'RepoLogView');
		} finally {
			setIsLoadingGitData(false);
			setNeedsToReload(false)
		}
	};

	const refetchRepo = async () => {
		try {
			setIsLoadingGitData(true);
			await GitFetch(repoPath);
			await Promise.all([loadAllRefsInner(), refreshLogsInner(currentLogOptions)]);
		} catch (error) {
			Logger.error(`Failed to fetch: ${error}`, 'git-log-toolbar');
		} finally {
			setIsLoadingGitData(false);
		}
	};

	// Get git log data for this repo
	const logs = logData.get(repoPath);

	// All the refs that git is tracking for this repo
	const refs = gitRefs.get(repoPath);

	useEffect(() => {
		if (needsToReload) {
			refreshLogAndRefs();
		}
	}, [needsToReload]);

	return {
		isLoading: isLoadingMap.get(repoPath) || false,

		// Get git log data for this repo
		logs: logs || [],

		// All the refs that git is tracking for this repo
		refs,

		refreshLogAndRefs: () => {
			setNeedsToReload(true)
		},
		refetchRepo,

		// Get selected commit for this repo
		selectedCommit: {
			get: () => selectedCommits.get(repoPath) || null,
			set: setSelectedCommit,
		},

		// Get log options for this repo
		options: {
			get: () => currentLogOptions,
			set: setLogViewOptions,
		},

		// Clear all log state for this repo
		disposeLogState: () => {
			const newLogDataMap = new Map(logData);
			newLogDataMap.delete(repoPath);
			setLogData(newLogDataMap);

			const newSelectedMap = new Map(selectedCommits);
			newSelectedMap.delete(repoPath);
			setSelectedCommits(newSelectedMap);

			const newGitRefsMap = new Map(gitRefs);
			newGitRefsMap.delete(repoPath);
			setGitRefs(newGitRefsMap);

			const newOptionsMap = new Map(logOptionsMap);
			newOptionsMap.delete(repoPath);
			setLogOptionsMap(newOptionsMap);
		},
	};
}
