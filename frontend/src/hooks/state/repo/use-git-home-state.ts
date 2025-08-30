import {
	createLoadTrackedMappedAtom,
	useLoadTrackedMapPrimitive,
} from '@/hooks/state/primitives/use-load-tracked-map-primitive';
import Logger from '@/utils/logger';
import { atom } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GetWorktrees, RunGitLog } from '../../../../wailsjs/go/backend/App';
import { git_operations } from '../../../../wailsjs/go/models';
import { useMapPrimitive } from '../primitives/use-map-primitive';

// State atoms for home view data per repository path
const worktreesAtom = createLoadTrackedMappedAtom<git_operations.WorktreeInfo[]>();
const recentCommitsAtom = createLoadTrackedMappedAtom<git_operations.GitLogCommitInfo[]>();

// Track if data has been initially loaded for each repo
const hasInitialLoadedAtom = atom<Map<string, boolean>>(new Map());

export function useRepoHomeState(repoPath: string) {
	const _worktreesPrim = useLoadTrackedMapPrimitive(worktreesAtom, repoPath, async () => {
		try {
			const worktrees = await GetWorktrees(repoPath);
			return worktrees;
		} catch (error) {
			Logger.error(`Failed to load worktrees: ${error}`, 'HomeState');
			return undefined;
		}
	});

	const _recentCommitsPrim = useLoadTrackedMapPrimitive(recentCommitsAtom, repoPath, async () => {
		try {
			const commitsToLoad = 10;
			const options = {
				commitsToLoad,
				fromRef: undefined,
				searchQuery: undefined,
			};
			const commits = await RunGitLog(repoPath, options);
			return commits;
		} catch (error) {
			Logger.error(`Failed to load recent commits: ${error}`, 'HomeState');
			return undefined;
		}
	});

	// Track initial load state
	const _hasInitialLoadedPrim = useMapPrimitive(hasInitialLoadedAtom, repoPath);
	const [needsToReload, setNeedsToReload] = useState(false);

	// Refresh all home data
	const refreshHomeData = useCallback(async () => {
		if (!needsToReload) {
			return;
		}

		const loadPrimitives = [_worktreesPrim, _recentCommitsPrim];
		for await (const loadPrimitive of loadPrimitives) {
			loadPrimitive.load();
		}

		_hasInitialLoadedPrim.set(true);
		setNeedsToReload(false);
	}, [needsToReload, _worktreesPrim, _recentCommitsPrim, _hasInitialLoadedPrim, setNeedsToReload]);

	// Auto-load data on first use
	useEffect(() => {
		refreshHomeData();
	}, [needsToReload, refreshHomeData]);

	useEffect(() => {
		if (!_hasInitialLoadedPrim.value) {
			setNeedsToReload(true);
		}
	}, []);

	// Helper to determine if we're in a worktree repository
	const isWorktreeRepo = (_worktreesPrim.value?.length ?? 0) > 0;

	const isAnyLoading = _worktreesPrim.isLoading || _recentCommitsPrim.isLoading;

	return useMemo(() => {
		return {
			// Data
			worktrees: _worktreesPrim,
			recentCommits: _recentCommitsPrim,
			isWorktreeRepo,

			// Loading states
			isAnyLoading,

			// Actions
			refreshHomeData: () => setNeedsToReload(true),

			// Cleanup
			disposeHomeState: () => {
				_worktreesPrim.kill();
				_recentCommitsPrim.kill();
				_hasInitialLoadedPrim.kill();
			},
		};
	}, [
		_worktreesPrim,
		_recentCommitsPrim,
		isWorktreeRepo,
		isAnyLoading,
		setNeedsToReload,
		_hasInitialLoadedPrim,
	]);
}

export function useGitHomeStateAtoms() {
	return {
		worktreesAtom,
		recentCommitsAtom,
		hasInitialLoadedAtom,
	};
}
