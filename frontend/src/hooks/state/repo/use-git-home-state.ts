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
import { useMapPrimitive } from '../use-map-primitive';

// State atoms for home view data per repository path
const recentBranchesAtom = atom<Map<string, git_operations.GitRef[]>>(new Map());
const currentBranchAtom = atom<Map<string, string>>(new Map());
const worktreesAtom = atom<Map<string, git_operations.WorktreeInfo[]>>(new Map());
const recentCommitsAtom = atom<Map<string, git_operations.GitLogCommitInfo[]>>(new Map());

// Loading state atoms
const isLoadingBranchesAtom = atom<Map<string, boolean>>(new Map());
const isLoadingCurrentBranchAtom = atom<Map<string, boolean>>(new Map());
const isLoadingWorktreesAtom = atom<Map<string, boolean>>(new Map());
const isLoadingRecentCommitsAtom = atom<Map<string, boolean>>(new Map());

// Track if data has been initially loaded for each repo
const hasInitialLoadedAtom = atom<Map<string, boolean>>(new Map());

export function getHomeState(repoPath: string) {
	// State primitives
	const _recentBranchesPrim = useMapPrimitive(recentBranchesAtom, repoPath);
	const _currentBranchPrim = useMapPrimitive(currentBranchAtom, repoPath);
	const _worktreesPrim = useMapPrimitive(worktreesAtom, repoPath);
	const _recentCommitsPrim = useMapPrimitive(recentCommitsAtom, repoPath);

	// Loading primitives
	const _isLoadingBranchesPrim = useMapPrimitive(isLoadingBranchesAtom, repoPath);
	const _isLoadingCurrentBranchPrim = useMapPrimitive(isLoadingCurrentBranchAtom, repoPath);
	const _isLoadingWorktreesPrim = useMapPrimitive(isLoadingWorktreesAtom, repoPath);
	const _isLoadingRecentCommitsPrim = useMapPrimitive(isLoadingRecentCommitsAtom, repoPath);

	// Track initial load state
	const _hasInitialLoadedPrim = useMapPrimitive(hasInitialLoadedAtom, repoPath);

	const [needsToReload, setNeedsToReload] = useState(false);

	// Load recent branches (limit to 8 for home view)
	const loadRecentBranches = async () => {
		if (_isLoadingBranchesPrim.value) {
			return;
		}

		try {
			_isLoadingBranchesPrim.set(true);
			const branches = await GetRecentBranches(repoPath, 8);
			_recentBranchesPrim.set(branches);
		} catch (error) {
			Logger.error(`Failed to load recent branches: ${error}`, 'HomeState');
			_recentBranchesPrim.set([]);
		} finally {
			_isLoadingBranchesPrim.set(false);
		}
	};

	// Load current branch name
	const loadCurrentBranch = async () => {
		if (_isLoadingCurrentBranchPrim.value) {
			return;
		}

		try {
			_isLoadingCurrentBranchPrim.set(true);
			const currentBranch = await GetCurrentBranchName(repoPath);
			_currentBranchPrim.set(currentBranch);
		} catch (error) {
			Logger.error(`Failed to load current branch: ${error}`, 'HomeState');
			_currentBranchPrim.set('');
		} finally {
			_isLoadingCurrentBranchPrim.set(false);
		}
	};

	// Load worktrees (returns empty array if not a worktree repo)
	const loadWorktrees = async () => {
		if (_isLoadingWorktreesPrim.value) {
			return;
		}

		try {
			_isLoadingWorktreesPrim.set(true);
			const worktrees = await GetWorktrees(repoPath);
			_worktreesPrim.set(worktrees);
		} catch (error) {
			Logger.error(`Failed to load worktrees: ${error}`, 'HomeState');
			_worktreesPrim.set([]);
		} finally {
			_isLoadingWorktreesPrim.set(false);
		}
	};

	// Load recent commits (limit to 6 for home view)
	const loadRecentCommits = async () => {
		if (_isLoadingRecentCommitsPrim.value) {
			return;
		}

		try {
			_isLoadingRecentCommitsPrim.set(true);
			const commitsToLoad = 6;
			const options = {
				commitsToLoad,
				fromRef: undefined,
				searchQuery: undefined,
			};
			const commits = await RunGitLog(repoPath, options);
			_recentCommitsPrim.set(commits);
		} catch (error) {
			Logger.error(`Failed to load recent commits: ${error}`, 'HomeState');
			_recentCommitsPrim.set([]);
		} finally {
			_isLoadingRecentCommitsPrim.set(false);
		}
	};

	// Refresh all home data
	const refreshHomeData = async () => {
		await Promise.all([loadRecentBranches(), loadCurrentBranch(), loadWorktrees(), loadRecentCommits()]);
		_hasInitialLoadedPrim.set(true);
		setNeedsToReload(false);
	};

	// Auto-load data on first use
	useEffect(() => {
		if (!_hasInitialLoadedPrim.value && !needsToReload) {
			setNeedsToReload(true);
		}
	}, [needsToReload, _hasInitialLoadedPrim.value]);

	useEffect(() => {
		refreshHomeData();
	}, [needsToReload]);

	// Helper to determine if we're in a worktree repository
	const isWorktreeRepo = (_worktreesPrim.value?.length ?? 0) > 0;

	return {
		// Data
		recentBranches: _recentBranchesPrim.value ?? [],
		currentBranch: _currentBranchPrim.value ?? '',
		worktrees: _worktreesPrim.value ?? [],
		recentCommits: _recentCommitsPrim.value ?? [],
		isWorktreeRepo,

		// Loading states
		loadingStates: {
			branches: _isLoadingBranchesPrim.value ?? false,
			currentBranch: _isLoadingCurrentBranchPrim.value ?? false,
			worktrees: _isLoadingWorktreesPrim.value ?? false,
			recentCommits: _isLoadingRecentCommitsPrim.value ?? false,
		},

		// Actions
		refreshHomeData: () => setNeedsToReload(true),
		loadRecentBranches,
		loadCurrentBranch,
		loadWorktrees,
		loadRecentCommits,

		// Cleanup
		disposeHomeState: () => {
			_recentBranchesPrim.kill();
			_currentBranchPrim.kill();
			_worktreesPrim.kill();
			_recentCommitsPrim.kill();
			_isLoadingBranchesPrim.kill();
			_isLoadingCurrentBranchPrim.kill();
			_isLoadingWorktreesPrim.kill();
			_isLoadingRecentCommitsPrim.kill();
			_hasInitialLoadedPrim.kill();
		},
	};
}
