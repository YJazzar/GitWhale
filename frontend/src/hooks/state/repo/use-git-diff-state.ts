import { useToast } from '@/hooks/use-toast';
import Logger from '@/utils/logger';
import { atom, useAtom } from 'jotai';
import { StartDiffSession, EndDiffSession } from '../../../../wailsjs/go/backend/App';
import { git_operations } from '../../../../wailsjs/go/models';
import { useFileManagerStatesCleanup } from '../use-file-manager-state';
import { useMapPrimitive } from '../use-map-primitive';

// Store diff sessions per repository path
const diffSessionsAtom = atom<Map<string, git_operations.DiffSession[]>>(new Map());

// Store selected session ID per repository path
const selectedDiffSessionAtom = atom<Map<string, string | null>>(new Map());

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
	const _diffSessionsPrim = useMapPrimitive(diffSessionsAtom, repoPath);
	const _selectedSessionIDPrim = useMapPrimitive(selectedDiffSessionAtom, repoPath);
	const _diffOptionsPrim = useMapPrimitive(diffOptionsAtom, repoPath);
	const _isLoadingPrim = useMapPrimitive(isLoadingDiffAtom, repoPath);

	// Get selected session ID for this repo
	const selectedSession = _diffSessionsPrim.value?.find(
		(s) => s.sessionId === _selectedSessionIDPrim.value
	);
	const allSessionIDs = _diffSessionsPrim.value?.map((session) => session.sessionId) ?? [];
	const allFileTabManagerSessionIDs = allSessionIDs.map(GetDiffSessionKeyForFileTabManagerSession)
	const { cleanupFileManagerStates } = useFileManagerStatesCleanup(allFileTabManagerSessionIDs);
	const { toast } = useToast();

	const createSession = async (options: git_operations.DiffOptions) => {
		try {
			_isLoadingPrim.set(true);

			const session = await StartDiffSession(options);
			const newSessions = [...(_diffSessionsPrim.value ?? []), session];
			Logger.debug(`Received session: ${session.sessionId}`, 'RepoDiffView');

			_diffSessionsPrim.set(newSessions);
			_selectedSessionIDPrim.set(session.sessionId);
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
			_isLoadingPrim.set(false);
		}
	};

	const closeSession = async (sessionId: string) => {
		try {
			await EndDiffSession(sessionId);
			const newSessions = _diffSessionsPrim.value?.filter((s) => s.sessionId !== sessionId) ?? [];
			_diffSessionsPrim.set(newSessions);

			if (_selectedSessionIDPrim.value === sessionId) {
				_selectedSessionIDPrim.set(newSessions.length > 0 ? newSessions[0].sessionId : null);
			}
		} catch (error) {
			Logger.error(`Failed to close diff session: ${error}`, 'RepoDiffView');
			throw error;
		}
	};

	return {
		isLoading: _isLoadingPrim.value || false,

		createSession,
		closeSession,

		// Get current sessions for this repo
		sessionData: _diffSessionsPrim.value ?? [],
		selectedSession: {
			setById: _selectedSessionIDPrim.set,
			getId: () => _selectedSessionIDPrim.value,
			getData: () => selectedSession,
		},

		// Get diff options for this repo
		options: _diffOptionsPrim.value || {
			fromRef: 'HEAD',
			toRef: '',
			showAdvanced: false,
			filePathFilters: '',
		},

		// Set diff options for this repo
		setOptions: _diffOptionsPrim.set,

		// Clear all diff state for this repo
		disposeSessions: () => {
			_diffSessionsPrim.kill();
			_selectedSessionIDPrim.kill();
			_diffOptionsPrim.kill();
			_isLoadingPrim.kill();
			
			cleanupFileManagerStates();
		},
	};
}


export function GetDiffSessionKeyForFileTabManagerSession(diffSessionID: string) { 
	return `diff-session-${diffSessionID}`
}