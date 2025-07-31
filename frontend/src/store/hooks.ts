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

export const useCurrentRepo = () => {
	const [currentRepoPath, setCurrentRepoPath] = useAtom(currentRepoPathAtom);
	const [repoData, setRepoData] = useAtom(currentRepoDataAtom);
	
	const updateRepoData = useCallback((updates: Partial<RepoData>) => {
		setRepoData(updates);
	}, [setRepoData]);
	
	const setCommits = useCallback((commits: backend.GitLogCommitInfo[]) => {
		updateRepoData({ commits, lastRefresh: Date.now() });
	}, [updateRepoData]);
	
	const setSelectedCommit = useCallback((commit: backend.GitLogCommitInfo | null) => {
		updateRepoData({ selectedCommit: commit });
	}, [updateRepoData]);
	
	const setLoading = useCallback((loading: boolean) => {
		updateRepoData({ loading });
	}, [updateRepoData]);
	
	return {
		currentRepoPath,
		setCurrentRepoPath,
		repoData,
		updateRepoData,
		setCommits,
		setSelectedCommit,
		setLoading,
		commits: repoData.commits,
		selectedCommit: repoData.selectedCommit,
		loading: repoData.loading,
		lastRefresh: repoData.lastRefresh
	};
};

export const useRepoData = (repoPath: string) => {
	const repoMap = useAtomValue(repoDataMapAtom);
	const setRepoMap = useSetAtom(repoDataMapAtom);
	
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
	
	return {
		repoData,
		updateRepoData
	};
};

// ============================================================================
// File Tabs Hooks
// ============================================================================

export const useFileTabs = () => {
	const [fileTabs, setFileTabs] = useAtom(fileTabsAtom);
	const [activeTabKey, setActiveTabKey] = useAtom(activeTabKeyAtom);
	
	const openFile = useCallback((fileData: FileTabData) => {
		setFileTabs(prev => {
			const existing = prev.find(tab => tab.tabKey === fileData.tabKey);
			if (existing) {
				return prev; // Already exists
			}
			return [...prev, fileData];
		});
		setActiveTabKey(fileData.tabKey);
	}, [setFileTabs, setActiveTabKey]);
	
	const closeFile = useCallback((tabKey: string) => {
		setFileTabs(prev => prev.filter(tab => tab.tabKey !== tabKey));
		// If closing active tab, switch to another tab
		setActiveTabKey(prev => {
			if (prev === tabKey) {
				const remaining = fileTabs.filter(tab => tab.tabKey !== tabKey);
				return remaining.length > 0 ? remaining[remaining.length - 1].tabKey : '';
			}
			return prev;
		});
	}, [setFileTabs, setActiveTabKey, fileTabs]);
	
	const setFilePermaOpen = useCallback((tabKey: string) => {
		setFileTabs(prev => prev.map(tab => 
			tab.tabKey === tabKey 
				? { ...tab, isPermanentlyOpen: true }
				: tab
		));
	}, [setFileTabs]);
	
	const getActiveFile = useCallback(() => {
		return fileTabs.find(tab => tab.tabKey === activeTabKey);
	}, [fileTabs, activeTabKey]);
	
	return {
		fileTabs,
		activeTabKey,
		setActiveTabKey,
		openFile,
		closeFile,
		setFilePermaOpen,
		getActiveFile
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

export const usePanelSizes = () => {
	const [panelSizes, setPanelSizes] = useAtom(panelSizesAtom);
	
	const savePanelSizes = useCallback((panelId: string, sizes: number[]) => {
		setPanelSizes(prev => ({ ...prev, [panelId]: sizes }));
	}, [setPanelSizes]);
	
	const getPanelSizes = useCallback((panelId: string, defaultSizes: number[] = []) => {
		return panelSizes[panelId] || defaultSizes;
	}, [panelSizes]);
	
	return {
		panelSizes,
		savePanelSizes,
		getPanelSizes
	};
};

// ============================================================================
// Terminal State Hooks
// ============================================================================

export const useTerminalSessions = () => {
	const [sessions, setSessions] = useAtom(terminalSessionsAtom);
	
	const addSession = useCallback((session: TerminalSession) => {
		setSessions(prev => [...prev, session]);
	}, [setSessions]);
	
	const removeSession = useCallback((sessionId: string) => {
		setSessions(prev => prev.filter(s => s.id !== sessionId));
	}, [setSessions]);
	
	const updateSession = useCallback((sessionId: string, updates: Partial<TerminalSession>) => {
		setSessions(prev => prev.map(s => 
			s.id === sessionId ? { ...s, ...updates } : s
		));
	}, [setSessions]);
	
	return {
		sessions,
		addSession,
		removeSession,
		updateSession
	};
};

// ============================================================================
// Git State Hooks
// ============================================================================

export const useCommitGraphCache = () => {
	const [cache, setCache] = useAtom(commitGraphCacheAtom);
	
	const getCachedGraph = useCallback((repoPath: string) => {
		return cache.get(repoPath);
	}, [cache]);
	
	const setCachedGraph = useCallback((repoPath: string, graph: any) => {
		const newCache = new Map(cache);
		newCache.set(repoPath, graph);
		setCache(newCache);
	}, [cache, setCache]);
	
	return {
		getCachedGraph,
		setCachedGraph
	};
};

export const useFileDiff = () => {
	const [fileDiffMap, setFileDiffMap] = useAtom(fileDiffMapAtom);
	
	const getFileDiff = useCallback((filePath: string) => {
		return fileDiffMap.get(filePath);
	}, [fileDiffMap]);
	
	const setFileDiff = useCallback((filePath: string, data: FileDiffData) => {
		const newMap = new Map(fileDiffMap);
		newMap.set(filePath, data);
		setFileDiffMap(newMap);
	}, [fileDiffMap, setFileDiffMap]);
	
	return {
		getFileDiff,
		setFileDiff
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
