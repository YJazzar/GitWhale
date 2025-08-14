import Logger from '@/utils/logger';
import { atom } from 'jotai';
import { useState, useEffect } from 'react';
import {
	GetRecentBranches,
	GetWorktrees,
	GetCurrentBranchName,
	RunGitLog,
} from '../../../../wailsjs/go/backend/App';
import { git_operations } from '../../../../wailsjs/go/models';
import { useMapPrimitive } from '../../primitives/use-map-primitive';
import {
	useLoadTrackedMapPrimitive,
	createLoadTrackedMappedAtom,
} from '@/hooks/primitives/use-load-tracked-map-primitive';

// State atoms for home view data per repository path
const recentBranchesAtom = createLoadTrackedMappedAtom<git_operations.GitRef[]>();
const currentBranchAtom = createLoadTrackedMappedAtom<string>();
const worktreesAtom = createLoadTrackedMappedAtom<git_operations.WorktreeInfo[]>();
const recentCommitsAtom = createLoadTrackedMappedAtom<git_operations.GitLogCommitInfo[]>();

// Track if data has been initially loaded for each repo
const hasInitialLoadedAtom = atom<Map<string, boolean>>(new Map());

export function getHomeState(repoPath: string) {
	const _recentBranchesPrim = useLoadTrackedMapPrimitive(recentBranchesAtom, repoPath, async () => {
		try {
			const branches = await GetRecentBranches(repoPath, 8);
			return branches;
		} catch (error) {
			Logger.error(`Failed to load recent branches: ${error}`, 'HomeState');
			return [];
		}
	});

	const _currentBranchPrim = useLoadTrackedMapPrimitive(currentBranchAtom, repoPath, async () => {
		try {
			const currentBranch = await GetCurrentBranchName(repoPath);
			return currentBranch;
		} catch (error) {
			Logger.error(`Failed to load current branch: ${error}`, 'HomeState');
			return undefined;
		}
	});

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
			const commitsToLoad = 6;
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
	const refreshHomeData = async () => {
		if (!needsToReload) {
			return;
		}

		const loadPrimitives = [_recentCommitsPrim, _currentBranchPrim, _worktreesPrim, _recentBranchesPrim];
		for await (const loadPrimitive of loadPrimitives) {
			loadPrimitive.load()
		}

		_hasInitialLoadedPrim.set(true);
		setNeedsToReload(false);
	};

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

	const isAnyLoading =
		_recentBranchesPrim.isLoading ||
		_currentBranchPrim.isLoading ||
		_worktreesPrim.isLoading ||
		_recentCommitsPrim.isLoading;

	return {
		// Data
		recentBranches: _recentBranchesPrim,
		currentBranch: _currentBranchPrim,
		worktrees: _worktreesPrim,
		recentCommits: _recentCommitsPrim,
		isWorktreeRepo,

		// Loading states
		isAnyLoading,

		// Actions
		refreshHomeData: () => setNeedsToReload(true),

		// Cleanup
		disposeHomeState: () => {
			_recentBranchesPrim.kill();
			_currentBranchPrim.kill();
			_worktreesPrim.kill();
			_recentCommitsPrim.kill();
			_hasInitialLoadedPrim.kill();
		},
	};
}
