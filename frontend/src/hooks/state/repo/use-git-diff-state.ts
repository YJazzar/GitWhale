import { useToast } from '@/hooks/use-toast';
import Logger from '@/utils/logger';
import { atom, useAtom } from 'jotai';
import { StartDiffSession, EndDiffSession } from '../../../../wailsjs/go/backend/App';
import { git_operations } from '../../../../wailsjs/go/models';
import { useFileManagerStatesCleanup } from '../use-file-manager-state';
import { useMapPrimitive } from '../use-map-primitive';

// Store diff sessions per repository path
const diffSessionsAtom = atom<Map<string, git_operations.DiffSession[]>>(new Map());

const isLoadingDiffAtom = atom<Map<string, boolean>>(new Map());

// MARK: Diff state management functions

export function getDiffState(repoPath: string) {
	const _diffSessionsPrim = useMapPrimitive(diffSessionsAtom, repoPath);
	const _isLoadingPrim = useMapPrimitive(isLoadingDiffAtom, repoPath);

	// Get selected session ID for this repo
	const allSessionIDs = _diffSessionsPrim.value?.map((session) => session.sessionId) ?? [];
	const allFileTabManagerSessionIDs = allSessionIDs.map(GetDiffSessionKeyForFileTabManagerSession);
	const { cleanupFileManagerStates } = useFileManagerStatesCleanup(allFileTabManagerSessionIDs);
	const { toast } = useToast();

	const createSession = async (options: git_operations.DiffOptions) => {
		try {
			_isLoadingPrim.set(true);

			const session = await StartDiffSession(options);
			Logger.debug(`Received session: ${session.sessionId}`, 'RepoDiffView');

			if (!session.hasDiffData) { 
				toast({
					variant: "default", 
					title: "No changes found"
				})
				return
			}

			const newSessions = [...(_diffSessionsPrim.value ?? []), session];
			_diffSessionsPrim.set(newSessions);
			return session;
		} catch (error) {
			Logger.error(`Failed to create diff session: ${error}`, 'RepoDiffView');
			Logger.error(`${JSON.stringify(error, null, 3)}`)

			toast({
				variant: 'destructive',
				title: 'Failed to create diff session',
				description: `${error}`,
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
		sessionsData: _diffSessionsPrim.value ?? [],

		// Clear all diff state for this repo
		disposeSessions: () => {
			_diffSessionsPrim.kill();
			_isLoadingPrim.kill();

			cleanupFileManagerStates();
		},
	};
}

export function GetDiffSessionKeyForFileTabManagerSession(diffSessionID: string) {
	return `diff-session-${diffSessionID}`;
}
