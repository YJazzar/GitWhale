import Logger from '@/utils/logger';
import { atom } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { GetAllRefs, GitFetch, RunGitLog } from '../../../../wailsjs/go/backend/App';
import { git_operations } from '../../../../wailsjs/go/models';
import { useMapPrimitive } from '../primitives/use-map-primitive';
import { UseAppState } from '../use-app-state';

// Map because each repo path needs to have the same data
const gitLogDataAtom = atom<Map<string, git_operations.GitLogCommitInfo[]>>(new Map());
const gitLogCommitSetAtom = atom<Map<string, Set<string>>>(new Map());
const isLoadingGitDataAtom = atom<Map<string, boolean>>(new Map());
const selectedCommitAtom = atom<Map<string, string[]>>(new Map());
const gitLogOptionsAtom = atom<Map<string, git_operations.GitLogOptions>>(new Map());
const gitRefsAtom = atom<Map<string, git_operations.GitRef[]>>(new Map());
const commitDetailsPaneStateAtom = atom<Map<string, boolean>>(new Map());

// Pagination state atoms
const isLoadingMoreCommitsAtom = atom<Map<string, boolean>>(new Map());
const hasMoreCommitsAtom = atom<Map<string, boolean>>(new Map());

// MARK: Git log state management functions

export function getLogState(repoPath: string) {
	const { appState } = UseAppState();
	const _isLoadingPrim = useMapPrimitive(isLoadingGitDataAtom, repoPath);

	// Store git log data
	const _gitLogDataPrim = useMapPrimitive(gitLogDataAtom, repoPath);
	const _gitLogCommitSetPrim = useMapPrimitive(gitLogCommitSetAtom, repoPath);

	// Store git log options/filters per repository path
	const _gitLogOptionsPrim = useMapPrimitive(gitLogOptionsAtom, repoPath);

	// When a user clicks to open a commit (the quick view kind that's embedded in the git-log-view)
	const _selectedCommitsPrim = useMapPrimitive(selectedCommitAtom, repoPath);

	// Store git refs (branches and tags) per repository path
	const _gitRefsPrim = useMapPrimitive(gitRefsAtom, repoPath);

	// Track whether user wants commit details pane to show (per repo) true = show pane, false = user dismissed
	const _commitDetailsPaneStatePrim = useMapPrimitive(commitDetailsPaneStateAtom, repoPath);

	// Pagination state primitives
	const _isLoadingMorePrim = useMapPrimitive(isLoadingMoreCommitsAtom, repoPath);
	const _hasMoreCommitsPrim = useMapPrimitive(hasMoreCommitsAtom, repoPath);

	const [needsToReload, setNeedsToReload] = useState(false);

	const currentSelectedCommits = _selectedCommitsPrim.value ?? [];

	// Compute child commit cache from loaded logs
	const childCommitCache = useMemo(() => {
		const logs = _gitLogDataPrim.value;
		if (!logs || logs.length === 0) {
			return new Map<string, string[]>();
		}

		const cache = new Map<string, string[]>();

		// Build parent -> children relationship map
		logs.forEach((commit) => {
			// For each parent of this commit, add this commit as a child
			commit.parentCommitHashes.forEach((parentHash) => {
				if (!cache.has(parentHash)) {
					cache.set(parentHash, []);
				}
				const children = cache.get(parentHash)!;
				// Avoid duplicates (shouldn't happen, but be safe)
				if (!children.includes(commit.commitHash)) {
					children.push(commit.commitHash);
				}
			});
		});

		return cache;
	}, [_gitLogDataPrim.value]);

	// Function to get child commits for a given commit hash
	const getChildCommits = (commitHash: string): string[] => {
		return childCommitCache.get(commitHash) || [];
	};

	const addToSelectedCommitsList = (commitHashToSelect: string, isSecondarySelect: boolean) => {
		if (!isSecondarySelect) {
			// we're in single-select mode right now, so we can clear out all other things selected
			_selectedCommitsPrim.set([commitHashToSelect]);
			return;
		}

		// Otherwise, if we have either one, or no commit selected, we can add it to the list of selected commits
		const numOfSelectedCommits = _selectedCommitsPrim.value?.length ?? 0;
		if (numOfSelectedCommits <= 1) {
			_selectedCommitsPrim.set([...(_selectedCommitsPrim.value ?? []), commitHashToSelect]);
			return;
		}

		// Last case: enforce rule that only 2 commits can be selected at a time
		const lastSelectedCommit = (_selectedCommitsPrim.value ?? [])[numOfSelectedCommits - 1];
		_selectedCommitsPrim.set([lastSelectedCommit, commitHashToSelect]);
	};

	const removeFromSelectedCommitsList = (commitHash: string) => {
		const previousIndex = currentSelectedCommits.findIndex((cH) => cH === commitHash);
		if (previousIndex === -1) {
			return;
		}

		let filteredSelectedCommits = [...currentSelectedCommits];
		filteredSelectedCommits.splice(previousIndex, 1);
		_selectedCommitsPrim.set(filteredSelectedCommits);
	};

	// Commit details pane state management
	const shouldShowCommitDetailsPane =
		_commitDetailsPaneStatePrim.value ?? appState?.appConfig?.settings?.ui?.autoShowCommitDetails;

	const dismissCommitDetailsPane = () => {
		_commitDetailsPaneStatePrim.set(false);
	};

	const showCommitDetailsPane = () => {
		_commitDetailsPaneStatePrim.set(true);
	};

	const currentLogOptions = _gitLogOptionsPrim.value || {
		author: undefined,
		commitsToLoad: appState?.appConfig?.settings?.git?.commitsToLoad,
		fromRef: undefined,
		searchQuery: undefined,
		toRef: undefined,
	};

	const refreshLogsInner = async (options: git_operations.GitLogOptions, append: boolean = false) => {
		const newLogs = await RunGitLog(repoPath, options);

		if (append && _gitLogDataPrim.value) {
			// Append new commits, filtering out duplicates
			const existingLogs = _gitLogDataPrim.value;
			const existingCommitSet = _gitLogCommitSetPrim.value || new Set<string>();
			
			const uniqueNewLogs = newLogs.filter(commit => !existingCommitSet.has(commit.commitHash));
			const combinedLogs = [...existingLogs, ...uniqueNewLogs];
			
			// Update both the array and set
			_gitLogDataPrim.set(combinedLogs);
			
			const updatedCommitSet = new Set(existingCommitSet);
			uniqueNewLogs.forEach(commit => updatedCommitSet.add(commit.commitHash));
			_gitLogCommitSetPrim.set(updatedCommitSet);
		} else {
			// Replace existing commits (initial load or refresh)
			_gitLogDataPrim.set(newLogs);
			
			const commitSet = new Set(newLogs.map(commit => commit.commitHash));
			_gitLogCommitSetPrim.set(commitSet);
		}

		// Determine if there are more commits by checking if we got the requested amount
		const requestedCount =
			options.commitsToLoad || appState?.appConfig?.settings?.git?.commitsToLoad || 50;
		_hasMoreCommitsPrim.set(newLogs.length >= requestedCount);
	};

	const loadAllRefsInner = async () => {
		const newRefs = await GetAllRefs(repoPath);
		_gitRefsPrim.set(newRefs);
	};

	const refreshLogAndRefs = async () => {
		if (_isLoadingPrim.value) {
			return;
		}

		try {
			_isLoadingPrim.set(true);
			_hasMoreCommitsPrim.set(true);

			await Promise.all([loadAllRefsInner(), refreshLogsInner(currentLogOptions, false)]);
		} catch (error) {
			Logger.error(`Failed to reload refs: ${error}`, 'RepoLogView');
		} finally {
			_isLoadingPrim.set(false);
			setNeedsToReload(false);
		}
	};

	// Find the best commit to continue loading from - one where we haven't loaded all its parents
	const findCommitWithUnloadedParents = (
		loadedCommits: git_operations.GitLogCommitInfo[],
		loadedCommitSet: Set<string>
	): string | null => {
		// Start from the end (most recent commits in topological order) and work backwards
		for (let i = loadedCommits.length - 2; i >= 0; i--) {
			const commit = loadedCommits[i];
			
			// Check if any parent commits are not loaded
			const hasUnloadedParents = commit.parentCommitHashes.some(
				parentHash => !loadedCommitSet.has(parentHash)
			);
			
			if (hasUnloadedParents) {
				return commit.commitHash;
			}
		}
		
		// If all loaded commits have their parents loaded, use the last commit
		return loadedCommits.length > 0 ? loadedCommits[loadedCommits.length - 1].commitHash : null;
	};

	const loadMoreCommits = async () => {
		// Prevent multiple simultaneous requests
		const prevLogs = _gitLogDataPrim.value;
		const loadedCommitSet = _gitLogCommitSetPrim.value;
		if (!prevLogs || !loadedCommitSet || _isLoadingMorePrim.value || _isLoadingPrim.value || !_hasMoreCommitsPrim.value) {
			return;
		}

		const fromCommitHash = findCommitWithUnloadedParents(prevLogs, loadedCommitSet);
		if (!fromCommitHash) {
			return;
		}

		try {
			_isLoadingMorePrim.set(true);

			// Create options for incremental loading from the optimal commit
			const incrementalOptions: git_operations.GitLogOptions = {
				...currentLogOptions,
				fromRef: fromCommitHash,
			};

			await refreshLogsInner(incrementalOptions, true);
		} catch (error) {
			Logger.error(`Failed to load more commits: ${error}`, 'RepoLogView');
		} finally {
			_isLoadingMorePrim.set(false);
		}
	};

	const refetchRepo = async () => {
		try {
			_isLoadingPrim.set(true);
			await GitFetch(repoPath);
			await Promise.all([loadAllRefsInner(), refreshLogsInner(currentLogOptions)]);
		} catch (error) {
			Logger.error(`Failed to fetch: ${error}`, 'git-log-toolbar');
		} finally {
			_isLoadingPrim.set(false);
		}
	};

	useEffect(() => {
		if (needsToReload) {
			refreshLogAndRefs();
		}
	}, [needsToReload]);

	return {
		isLoading: _isLoadingPrim.value || false,
		isLoadingMore: _isLoadingMorePrim.value || false,
		hasMoreCommits: _hasMoreCommitsPrim.value ?? true,

		// Get git log data for this repo
		logs: _gitLogDataPrim.value,

		// All the refs that git is tracking for this repo
		refs: _gitRefsPrim.value,

		refreshLogAndRefs: () => {
			setNeedsToReload(true);
		},

		loadMoreCommits,

		refetchRepo,

		// Get selected commit for this repo
		selectedCommits: {
			currentSelectedCommits,
			addToSelectedCommitsList,
			removeFromSelectedCommitsList,
		},

		// Commit details pane state
		commitDetailsPane: {
			shouldShow: shouldShowCommitDetailsPane,
			show: showCommitDetailsPane,
			dismiss: dismissCommitDetailsPane,
		},

		// Get log options for this repo
		options: {
			get: () => currentLogOptions,
			set: _gitLogOptionsPrim.set,
		},

		// Get child commits for a given commit hash (for navigation)
		getChildCommits,

		// Clear all log state for this repo
		disposeLogState: () => {
			_isLoadingPrim.kill();
			_gitLogDataPrim.kill();
			_selectedCommitsPrim.kill();
			_gitRefsPrim.kill();
			_gitLogOptionsPrim.kill();
			_commitDetailsPaneStatePrim.kill();
			_isLoadingMorePrim.kill();
			_hasMoreCommitsPrim.kill();
		},
	};
}
