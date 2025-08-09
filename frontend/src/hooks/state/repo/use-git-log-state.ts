import Logger from "@/utils/logger";
import { atom, useAtom } from "jotai";
import { useState, useEffect } from "react";
import { RunGitLog, GetAllRefs, GitFetch } from "wailsjs/go/backend/App";
import { git_operations } from "wailsjs/go/models";

// Store git log data per repository path
const gitLogDataAtom = atom<Map<string, git_operations.GitLogCommitInfo[]>>(new Map());

const isLoadingGitDataAtom = atom<Map<string, boolean>>(new Map());

// Store selected commits for details panel per repository path. Key is repoPath, value is commitHash
const selectedCommitAtom = atom<Map<string, string[]>>(new Map());

// Store git log options/filters per repository path
const gitLogOptionsAtom = atom<Map<string, git_operations.GitLogOptions>>(new Map());

// Store git refs (branches and tags) per repository path
const gitRefsAtom = atom<Map<string, git_operations.GitRef[]>>(new Map());

// MARK: Git log state management functions

export function getLogState(repoPath: string) {
	const [logData, setLogData] = useAtom(gitLogDataAtom);
	const [isLoadingMap, setIsLoadingMap] = useAtom(isLoadingGitDataAtom);
	const [selectedCommits, setSelectedCommits] = useAtom(selectedCommitAtom);
	const [gitRefs, setGitRefs] = useAtom(gitRefsAtom);
	const [logOptionsMap, setLogOptionsMap] = useAtom(gitLogOptionsAtom);

	const [needsToReload, setNeedsToReload] = useState(false);

	const isLoading = isLoadingMap.get(repoPath) || false;
	const setIsLoadingGitData = (newValue: boolean) => {
		const newMap = new Map(isLoadingMap);
		newMap.set(repoPath, newValue);
		setIsLoadingMap(newMap);
	};

	// When a user clicks to open a commit (the quick view kind that's embedded in the git-log-view)
	const __setSelectedCommit = (commitHash: string[]) => {
		const newMap = new Map(selectedCommits);
		newMap.set(repoPath, commitHash);
		setSelectedCommits(newMap);
	};

	const currentSelectedCommits = selectedCommits.get(repoPath) ?? [];
	const addToSelectedCommitsList = (commitHash: string) => {
		const previousIndex = currentSelectedCommits.findIndex((cH) => cH === commitHash)

		// Add the commit 
		if (previousIndex === -1) {
			__setSelectedCommit([...currentSelectedCommits, commitHash]);
			return;
		}

		// If it's already in the list of selected commits, move it around to be the last commit
		// (this matters for the commit details pane)
		let filteredSelectedCommits = [...currentSelectedCommits]
		filteredSelectedCommits.splice(previousIndex, 1)
		filteredSelectedCommits.push(commitHash)
		__setSelectedCommit(filteredSelectedCommits)
	};

	const removeFromSelectedCommitsList = (commitHash: string) => { 
		const previousIndex = currentSelectedCommits.findIndex((cH) => cH === commitHash)
		if (previousIndex === -1) {
			return;
		}

		let filteredSelectedCommits = [...currentSelectedCommits]
		filteredSelectedCommits.splice(previousIndex, 1)
		__setSelectedCommit(filteredSelectedCommits)
	}

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
			return;
		}

		try {
			setIsLoadingGitData(true);

			await Promise.all([loadAllRefsInner(), refreshLogsInner(currentLogOptions)]);
		} catch (error) {
			Logger.error(`Failed to reload refs: ${error}`, 'RepoLogView');
		} finally {
			setIsLoadingGitData(false);
			setNeedsToReload(false);
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
			setNeedsToReload(true);
		},
		refetchRepo,

		// Get selected commit for this repo
		selectedCommits: {
			currentSelectedCommits, 
			addToSelectedCommitsList, 
			removeFromSelectedCommitsList
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
