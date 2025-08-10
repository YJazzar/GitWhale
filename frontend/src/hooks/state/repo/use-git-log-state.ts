import Logger from '@/utils/logger';
import { atom, useAtom } from 'jotai';
import { useState, useEffect } from 'react';
import { RunGitLog, GetAllRefs, GitFetch } from '../../../../wailsjs/go/backend/App';
import { git_operations } from '../../../../wailsjs/go/models';
import { useMapPrimitive } from '../use-map-primitive';
import { UseAppState } from '../use-app-state';

// Map because each repo path needs to have the same data
const gitLogDataAtom = atom<Map<string, git_operations.GitLogCommitInfo[]>>(new Map());
const isLoadingGitDataAtom = atom<Map<string, boolean>>(new Map());
const selectedCommitAtom = atom<Map<string, string[]>>(new Map());
const gitLogOptionsAtom = atom<Map<string, git_operations.GitLogOptions>>(new Map());
const gitRefsAtom = atom<Map<string, git_operations.GitRef[]>>(new Map());
const commitDetailsPaneStateAtom = atom<Map<string, boolean>>(new Map()); 

// MARK: Git log state management functions

export function getLogState(repoPath: string) {
	const { appState } = UseAppState();
	const _isLoadingPrim = useMapPrimitive(isLoadingGitDataAtom, repoPath);

	// Store git log data
	const _gitLogDataPrim = useMapPrimitive(gitLogDataAtom, repoPath);

	// Store git log options/filters per repository path
	const _gitLogOptionsPrim = useMapPrimitive(gitLogOptionsAtom, repoPath);

	// When a user clicks to open a commit (the quick view kind that's embedded in the git-log-view)
	const _selectedCommitsPrim = useMapPrimitive(selectedCommitAtom, repoPath);

	// Store git refs (branches and tags) per repository path
	const _gitRefsPrim = useMapPrimitive(gitRefsAtom, repoPath);

	// Track whether user wants commit details pane to show (per repo) true = show pane, false = user dismissed
	const _commitDetailsPaneStatePrim = useMapPrimitive(commitDetailsPaneStateAtom, repoPath);

	const [needsToReload, setNeedsToReload] = useState(false);

	const currentSelectedCommits = _selectedCommitsPrim.value ?? [];
	const addToSelectedCommitsList = (commitHash: string, isSecondarySelect: boolean) => {
		if (!isSecondarySelect) { 
			// we're in single-select mode right now, so we can clear out all other things selected
			_selectedCommitsPrim.set([commitHash]);
		}

		const previousIndex = currentSelectedCommits.findIndex((cH) => cH === commitHash);

		// Add the commit
		if (previousIndex === -1) {
			_selectedCommitsPrim.set([...currentSelectedCommits, commitHash]);
			return;
		}

		// If it's already in the list of selected commits, move it around to be the last commit
		// (this matters for the commit details pane)
		let filteredSelectedCommits = [...currentSelectedCommits];
		filteredSelectedCommits.splice(previousIndex, 1);
		filteredSelectedCommits.push(commitHash);
		_selectedCommitsPrim.set(filteredSelectedCommits);
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
	const shouldShowCommitDetailsPane = _commitDetailsPaneStatePrim.value ?? appState?.appConfig?.settings?.ui?.autoShowCommitDetails

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

	const refreshLogsInner = async (options: git_operations.GitLogOptions) => {
		const newLogs = await RunGitLog(repoPath, options);
		_gitLogDataPrim.set(newLogs);
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

			await Promise.all([loadAllRefsInner(), refreshLogsInner(currentLogOptions)]);
		} catch (error) {
			Logger.error(`Failed to reload refs: ${error}`, 'RepoLogView');
		} finally {
			_isLoadingPrim.set(false);
			setNeedsToReload(false);
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

		// Get git log data for this repo
		logs: _gitLogDataPrim.value,

		// All the refs that git is tracking for this repo
		refs: _gitRefsPrim.value,

		refreshLogAndRefs: () => {
			setNeedsToReload(true);
		},

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

		// Clear all log state for this repo
		disposeLogState: () => {
			_isLoadingPrim.kill()
			_gitLogDataPrim.kill()
			_selectedCommitsPrim.kill()
			_gitRefsPrim.kill()
			_gitLogOptionsPrim.kill()
			_commitDetailsPaneStatePrim.kill()
		},
	};
}
