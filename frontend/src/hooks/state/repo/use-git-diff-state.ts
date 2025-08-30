import { useToast } from '@/hooks/use-toast';
import Logger from '@/utils/logger';
import { atom } from 'jotai';
import { EndDiffSession, StartDiffSession } from '../../../../wailsjs/go/backend/App';
import { git_operations } from '../../../../wailsjs/go/models';
import { useMapPrimitive } from '../primitives/use-map-primitive';
import { FileTabsSessionKeyGenerator } from '../useFileTabsHandlers';
import { useFileManagerStatesCleanup } from '../useFileTabsState';
import { useCallback, useMemo } from 'react';

// Store diff sessions per repository path
const diffSessionsAtom = atom<Map<string, git_operations.DiffSession[]>>(new Map());

const isLoadingDiffAtom = atom<Map<string, boolean>>(new Map());

// MARK: Diff state management functions

export function getDiffState(repoPath: string) {
	const _diffSessionsPrim = useMapPrimitive(diffSessionsAtom, repoPath);
	const _isLoadingPrim = useMapPrimitive(isLoadingDiffAtom, repoPath);

	// Get selected session ID for this repo
	const allSessionIDs = _diffSessionsPrim.value?.map((session) => session.sessionId) ?? [];
	const allFileTabManagerSessionIDs = allSessionIDs.map(FileTabsSessionKeyGenerator.diffSession);
	const diffStateFileTabs = useFileManagerStatesCleanup(allFileTabManagerSessionIDs);

	const { toast } = useToast();

	const createSession = useCallback(
		async (options: git_operations.DiffOptions) => {
			try {
				_isLoadingPrim.set(true);

				const session = await StartDiffSession(options);
				Logger.debug(`Received session: ${session.sessionId}`, 'RepoDiffView');

				if (!session.hasDiffData) {
					toast({
						variant: 'default',
						title: 'No changes found',
					});
					return;
				}

				const newSessions = [...(_diffSessionsPrim.value ?? []), session];
				_diffSessionsPrim.set(newSessions);
				return session;
			} catch (error) {
				Logger.error(`Failed to create diff session: ${error}`, 'RepoDiffView');
				Logger.error(`${JSON.stringify(error, null, 3)}`);

				toast({
					variant: 'destructive',
					title: 'Failed to create diff session',
					description: `${error}`,
				});

				return undefined;
			} finally {
				_isLoadingPrim.set(false);
			}
		},
		[_isLoadingPrim.set, toast, _diffSessionsPrim.set]
	);

	const closeSession = useCallback(
		async (sessionId: string) => {
			try {
				await EndDiffSession(sessionId);
				const newSessions = _diffSessionsPrim.value?.filter((s) => s.sessionId !== sessionId) ?? [];
				_diffSessionsPrim.set(newSessions);
			} catch (error) {
				Logger.error(`Failed to close diff session: ${error}`, 'RepoDiffView');
				throw error;
			}
		},
		[_diffSessionsPrim.value, _diffSessionsPrim.set]
	);

	return useMemo(() => {
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
				diffStateFileTabs.cleanupFileManagerStates();
			},
		};
	}, [
		_isLoadingPrim.value,
		createSession,
		closeSession,
		_diffSessionsPrim.value,
		_diffSessionsPrim.kill,
		_isLoadingPrim.kill,
		diffStateFileTabs.cleanupFileManagerStates,
	]);
}

export function useGitDiffStateAtoms() {
	return {
		diffSessionsAtom,
		isLoadingDiffAtom,
	};
}
