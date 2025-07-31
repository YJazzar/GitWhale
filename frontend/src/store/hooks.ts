/**
 * React hooks for working with the global state store
 * These hooks provide convenient interfaces for components to interact with state
 */

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { backend } from 'wailsjs/go/models';
import {
	appStateAtom,
	currentRepoPathAtom,
	currentRepoDataAtom,
	repoDataMapAtom,
	fileTabsAtom,
	activeTabKeyAtom,
	themeAtom,
	sidebarOpenAtom,
	sidebarMobileOpenAtom,
	panelSizesAtom,
	terminalSessionsAtom,
	commitGraphCacheAtom,
	fileDiffMapAtom,
	dirDiffStateAtom,
	recentActivityAtom,
	searchQueryAtom,
	navigationHistoryAtom,
	currentRouteAtom,
	type FileTabData,
	type RepoData,
	type TerminalSession,
	type FileDiffData,
	type DirDiffState,
	type RecentActivity
} from './index';
import { GetAppState } from '../../wailsjs/go/backend/App';

// ============================================================================
// App State Hooks
// ============================================================================

export const useAppState = () => {
	const [appState, setAppState] = useAtom(appStateAtom);
	
	const refreshAppState = useCallback(async () => {
		const newAppState = await GetAppState();
		setAppState(newAppState);
		return newAppState;
	}, [setAppState]);

	return {
		appState,
		setAppState,
		refreshAppState
	};
};

// ============================================================================
// Repository State Hooks
// ============================================================================

/**
 * Hook for managing repository state for a specific repo path
 * @param repoPath - The absolute path to the repository
 */
export const useRepoState = (repoPath: string) => {
	const repoMap = useAtomValue(repoDataMapAtom);
	const setRepoMap = useSetAtom(repoDataMapAtom);
	const setCurrentRepoPath = useSetAtom(currentRepoPathAtom);
	
	const repoData = repoMap.get(repoPath) || {
		commits: [],
		selectedCommit: null,
		loading: false,
		lastRefresh: 0
	};
	
	const updateRepoData = useCallback((updates: Partial<RepoData>) => {
		const newMap = new Map(repoMap);
		newMap.set(repoPath, { ...repoData, ...updates });
		setRepoMap(newMap);
	}, [repoMap, setRepoMap, repoPath, repoData]);
	
	const setCommits = useCallback((commits: backend.GitLogCommitInfo[]) => {
		updateRepoData({ commits, lastRefresh: Date.now() });
	}, [updateRepoData]);
	
	const setSelectedCommit = useCallback((commit: backend.GitLogCommitInfo | null) => {
		updateRepoData({ selectedCommit: commit });
	}, [updateRepoData]);
	
	const setLoading = useCallback((loading: boolean) => {
		updateRepoData({ loading });
	}, [updateRepoData]);
	
	const makeActive = useCallback(() => {
		setCurrentRepoPath(repoPath);
	}, [setCurrentRepoPath, repoPath]);
	
	return {
		// State
		commits: repoData.commits,
		selectedCommit: repoData.selectedCommit,
		loading: repoData.loading,
		lastRefresh: repoData.lastRefresh,
		
		// Actions
		setCommits,
		setSelectedCommit,
		setLoading,
		makeActive,
		
		// Low-level access (use sparingly)
		updateRepoData
	};
};

/**
 * Hook for getting the currently active repository path and switching between repos
 */
export const useCurrentRepoPath = () => {
	const [currentRepoPath, setCurrentRepoPath] = useAtom(currentRepoPathAtom);
	
	return {
		currentRepoPath,
		setCurrentRepoPath
	};
};

/**
 * Hook that combines current repo path with repo state for convenience
 * Useful when you don't know the repo path upfront
 */
export const useCurrentRepo = () => {
	const { currentRepoPath, setCurrentRepoPath } = useCurrentRepoPath();
	const repoState = useRepoState(currentRepoPath || '');
	
	return {
		currentRepoPath,
		setCurrentRepoPath,
		...repoState
	};
};

// ============================================================================
// File Tabs Hooks
// ============================================================================

/**
 * Hook for managing file tabs in a specific context (e.g., main workspace, specific repo)
 * @param context - Optional context identifier (defaults to 'global')
 */
export const useFileTabs = (context: string = 'global') => {
	const [allFileTabs, setAllFileTabs] = useAtom(fileTabsAtom);
	const [activeTabKey, setActiveTabKey] = useAtom(activeTabKeyAtom);
	
	// Filter tabs by context
	const fileTabs = allFileTabs.filter(tab => 
		tab.tabKey.startsWith(`${context}:`) || (!tab.tabKey.includes(':') && context === 'global')
	);
	
	const openFile = useCallback((fileData: Omit<FileTabData, 'tabKey'> & { tabKey?: string }) => {
		const tabKey = fileData.tabKey || `${context}:${fileData.linkPath}`;
		const fullFileData = { ...fileData, tabKey };
		
		setAllFileTabs(prev => {
			const existing = prev.find(tab => tab.tabKey === tabKey);
			if (existing) {
				return prev; // Already exists
			}
			return [...prev, fullFileData];
		});
		setActiveTabKey(tabKey);
	}, [setAllFileTabs, setActiveTabKey, context]);
	
	const closeFile = useCallback((tabKey: string) => {
		setAllFileTabs(prev => prev.filter(tab => tab.tabKey !== tabKey));
		// If closing active tab, switch to another tab in this context
		setActiveTabKey(prev => {
			if (prev === tabKey) {
				const remaining = fileTabs.filter(tab => tab.tabKey !== tabKey);
				return remaining.length > 0 ? remaining[remaining.length - 1].tabKey : '';
			}
			return prev;
		});
	}, [setAllFileTabs, setActiveTabKey, fileTabs]);
	
	const setFilePermaOpen = useCallback((tabKey: string) => {
		setAllFileTabs(prev => prev.map(tab => 
			tab.tabKey === tabKey 
				? { ...tab, isPermanentlyOpen: true }
				: tab
		));
	}, [setAllFileTabs]);
	
	const getActiveFile = useCallback(() => {
		return allFileTabs.find(tab => tab.tabKey === activeTabKey);
	}, [allFileTabs, activeTabKey]);
	
	const isActiveInContext = activeTabKey?.startsWith(`${context}:`) || 
		(!activeTabKey?.includes(':') && context === 'global');
	
	return {
		fileTabs,
		activeTabKey: isActiveInContext ? activeTabKey : undefined,
		setActiveTabKey,
		openFile,
		closeFile,
		setFilePermaOpen,
		getActiveFile: isActiveInContext ? getActiveFile : () => undefined
	};
};

// ============================================================================
// UI State Hooks
// ============================================================================

export const useTheme = () => {
	const [theme, setTheme] = useAtom(themeAtom);
	return { theme, setTheme };
};

export const useSidebar = () => {
	const [open, setOpen] = useAtom(sidebarOpenAtom);
	const [mobileOpen, setMobileOpen] = useAtom(sidebarMobileOpenAtom);
	
	const toggleSidebar = useCallback(() => {
		setOpen(prev => !prev);
	}, [setOpen]);
	
	return {
		open,
		setOpen,
		mobileOpen,
		setMobileOpen,
		toggleSidebar
	};
};

/**
 * Hook for managing panel sizes for a specific panel group
 * @param panelId - Unique identifier for the panel group (e.g., 'repo-log-view', 'diff-view')
 * @param defaultSizes - Default sizes to use if none are saved
 */
export const usePanelSizes = (panelId: string, defaultSizes: number[] = [50, 50]) => {
	const [panelSizes, setPanelSizes] = useAtom(panelSizesAtom);
	
	const currentSizes = panelSizes[panelId] || defaultSizes;
	
	const savePanelSizes = useCallback((sizes: number[]) => {
		setPanelSizes(prev => ({ ...prev, [panelId]: sizes }));
	}, [setPanelSizes, panelId]);
	
	const resetToDefault = useCallback(() => {
		setPanelSizes(prev => {
			const newSizes = { ...prev };
			delete newSizes[panelId];
			return newSizes;
		});
	}, [setPanelSizes, panelId]);
	
	return {
		sizes: currentSizes,
		saveSizes: savePanelSizes,
		resetToDefault
	};
};

// ============================================================================
// Terminal State Hooks
// ============================================================================

/**
 * Hook for managing terminal sessions for a specific repository
 * @param repoPath - The absolute path to the repository
 */
export const useTerminalSessions = (repoPath: string) => {
	const [allSessions, setAllSessions] = useAtom(terminalSessionsAtom);
	
	// Filter sessions by repo path
	const sessions = allSessions.filter(session => session.repoPath === repoPath);
	
	const addSession = useCallback((session: Omit<TerminalSession, 'repoPath'>) => {
		const fullSession = { ...session, repoPath };
		setAllSessions(prev => [...prev, fullSession]);
	}, [setAllSessions, repoPath]);
	
	const removeSession = useCallback((sessionId: string) => {
		setAllSessions(prev => prev.filter(s => s.id !== sessionId));
	}, [setAllSessions]);
	
	const updateSession = useCallback((sessionId: string, updates: Partial<Omit<TerminalSession, 'repoPath'>>) => {
		setAllSessions(prev => prev.map(s => 
			s.id === sessionId && s.repoPath === repoPath ? { ...s, ...updates } : s
		));
	}, [setAllSessions, repoPath]);
	
	const getActiveSession = useCallback(() => {
		return sessions.find(s => s.isActive);
	}, [sessions]);
	
	const setActiveSession = useCallback((sessionId: string) => {
		setAllSessions(prev => prev.map(s => ({
			...s,
			isActive: s.id === sessionId && s.repoPath === repoPath
		})));
	}, [setAllSessions, repoPath]);
	
	return {
		sessions,
		addSession,
		removeSession,
		updateSession,
		getActiveSession,
		setActiveSession
	};
};

/**
 * Hook for getting all terminal sessions across all repositories
 * Useful for global terminal management UI
 */
export const useAllTerminalSessions = () => {
	const [sessions, setSessions] = useAtom(terminalSessionsAtom);
	
	const removeSession = useCallback((sessionId: string) => {
		setSessions(prev => prev.filter(s => s.id !== sessionId));
	}, [setSessions]);
	
	const getSessionsByRepo = useCallback((repoPath: string) => {
		return sessions.filter(s => s.repoPath === repoPath);
	}, [sessions]);
	
	return {
		allSessions: sessions,
		removeSession,
		getSessionsByRepo
	};
};

// ============================================================================
// Git State Hooks
// ============================================================================

/**
 * Hook for managing commit graph cache for a specific repository
 * @param repoPath - The absolute path to the repository
 */
export const useCommitGraphCache = (repoPath: string) => {
	const [cache, setCache] = useAtom(commitGraphCacheAtom);
	
	const getCachedGraph = useCallback((commitsHash: string) => {
		const cacheKey = `${repoPath}:${commitsHash}`;
		return cache.get(cacheKey);
	}, [cache, repoPath]);
	
	const setCachedGraph = useCallback((commitsHash: string, graph: any) => {
		const cacheKey = `${repoPath}:${commitsHash}`;
		const newCache = new Map(cache);
		newCache.set(cacheKey, graph);
		setCache(newCache);
	}, [cache, setCache, repoPath]);
	
	const clearCache = useCallback(() => {
		const newCache = new Map(cache);
		// Remove all entries for this repo
		for (const [key] of newCache) {
			if (key.startsWith(`${repoPath}:`)) {
				newCache.delete(key);
			}
		}
		setCache(newCache);
	}, [cache, setCache, repoPath]);
	
	return {
		getCachedGraph,
		setCachedGraph,
		clearCache
	};
};

/**
 * Hook for managing file diff cache for specific files
 * @param fileIdentifier - Unique identifier for the file (e.g., file path or comparison key)
 */
export const useFileDiff = (fileIdentifier: string) => {
	const [fileDiffMap, setFileDiffMap] = useAtom(fileDiffMapAtom);
	
	const fileDiff = fileDiffMap.get(fileIdentifier);
	
	const setFileDiff = useCallback((data: FileDiffData) => {
		const newMap = new Map(fileDiffMap);
		newMap.set(fileIdentifier, data);
		setFileDiffMap(newMap);
	}, [fileDiffMap, setFileDiffMap, fileIdentifier]);
	
	const clearFileDiff = useCallback(() => {
		const newMap = new Map(fileDiffMap);
		newMap.delete(fileIdentifier);
		setFileDiffMap(newMap);
	}, [fileDiffMap, setFileDiffMap, fileIdentifier]);
	
	const isLoading = fileDiff?.loading || false;
	const hasContent = !!fileDiff?.content;
	
	return {
		fileDiff,
		content: fileDiff?.content,
		isLoading,
		hasContent,
		setFileDiff,
		clearFileDiff
	};
};

/**
 * Hook for getting all cached file diffs (for cleanup, debugging, etc.)
 */
export const useAllFileDiffs = () => {
	const [fileDiffMap, setFileDiffMap] = useAtom(fileDiffMapAtom);
	
	const clearAllDiffs = useCallback(() => {
		setFileDiffMap(new Map());
	}, [setFileDiffMap]);
	
	const clearDiffsForRepo = useCallback((repoPath: string) => {
		const newMap = new Map(fileDiffMap);
		for (const [key] of newMap) {
			if (key.includes(repoPath)) {
				newMap.delete(key);
			}
		}
		setFileDiffMap(newMap);
	}, [fileDiffMap, setFileDiffMap]);
	
	return {
		allDiffs: fileDiffMap,
		clearAllDiffs,
		clearDiffsForRepo
	};
};

// ============================================================================
// Directory Diff Hooks
// ============================================================================

export const useDirDiff = () => {
	const [dirDiffState, setDirDiffState] = useAtom(dirDiffStateAtom);
	
	const updateDirDiff = useCallback((updates: Partial<DirDiffState>) => {
		setDirDiffState(prev => ({ ...prev, ...updates }));
	}, [setDirDiffState]);
	
	return {
		dirDiffState,
		setDirDiffState,
		updateDirDiff
	};
};

// ============================================================================
// Activity and Navigation Hooks
// ============================================================================

export const useRecentActivity = () => {
	const [activities, setActivities] = useAtom(recentActivityAtom);
	
	const addActivity = useCallback((activity: Omit<RecentActivity, 'id' | 'timestamp'>) => {
		const newActivity: RecentActivity = {
			...activity,
			id: Date.now().toString(),
			timestamp: Date.now()
		};
		setActivities(prev => [newActivity, ...prev.slice(0, 99)]); // Keep last 100
	}, [setActivities]);
	
	return {
		activities,
		addActivity
	};
};

export const useNavigation = () => {
	const [searchQuery, setSearchQuery] = useAtom(searchQueryAtom);
	const [navigationHistory, setNavigationHistory] = useAtom(navigationHistoryAtom);
	const [currentRoute, setCurrentRoute] = useAtom(currentRouteAtom);
	
	const addToHistory = useCallback((route: string) => {
		setNavigationHistory(prev => {
			const filtered = prev.filter(r => r !== route);
			return [route, ...filtered.slice(0, 19)]; // Keep last 20
		});
	}, [setNavigationHistory]);
	
	return {
		searchQuery,
		setSearchQuery,
		navigationHistory,
		addToHistory,
		currentRoute,
		setCurrentRoute
	};
};
