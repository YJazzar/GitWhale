import { useToast } from "@/hooks/use-toast";
import Logger from "@/utils/logger";
import { atom, useAtom } from "jotai";
import { StartDiffSession, EndDiffSession } from "../../../../wailsjs/go/backend/App";
import { git_operations } from "../../../../wailsjs/go/models";
import { useFileManagerStatesCleanup } from "../use-file-manager-state";

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

export function getDiffState(repoPath: string) {
	const [diffSessionsMap, setDiffSessionsMap] = useAtom(diffSessionsAtom);
	const [selectedSessionIDMap, setSelectedSessionIDMap] = useAtom(selectedDiffSessionAtom);
	const [fileInfoMaps, setFileInfoMaps] = useAtom(fileInfoMapAtom);
	const [diffOptions, setDiffOptionsMap] = useAtom(diffOptionsAtom);
	const [isLoadingMap, setIsLoadingMap] = useAtom(isLoadingDiffAtom);

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
