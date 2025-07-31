/**
 * Global state management using Jotai atoms
 * This store preserves state across navigation to prevent data loss
 */

import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { backend } from 'wailsjs/go/models';

// ============================================================================
// App State (already exists but we'll standardize it)
// ============================================================================

export const appStateAtom = atom<backend.App | undefined>(undefined);

// ============================================================================
// Repository State
// ============================================================================

// Current repository being viewed
export const currentRepoPathAtom = atom<string>('');

// Repository-specific data (keyed by repo path)
export interface RepoData {
	commits: backend.GitLogCommitInfo[];
	selectedCommit: backend.GitLogCommitInfo | null;
	loading: boolean;
	lastRefresh: number;
}

export const repoDataMapAtom = atom<Map<string, RepoData>>(new Map());

// Computed atoms for current repo
export const currentRepoDataAtom = atom(
	(get) => {
		const currentPath = get(currentRepoPathAtom);
		const repoMap = get(repoDataMapAtom);
		return repoMap.get(currentPath) || {
			commits: [],
			selectedCommit: null,
			loading: false,
			lastRefresh: 0
		};
	},
	(get, set, newData: Partial<RepoData>) => {
		const currentPath = get(currentRepoPathAtom);
		const repoMap = new Map(get(repoDataMapAtom));
		const existingData = repoMap.get(currentPath) || {
			commits: [],
			selectedCommit: null,
			loading: false,
			lastRefresh: 0
		};
		
		repoMap.set(currentPath, { ...existingData, ...newData });
		set(repoDataMapAtom, repoMap);
	}
);

// ============================================================================
// File Tabs State
// ============================================================================

export interface FileTabData {
	tabKey: string;
	linkPath: string;
	title: string;
	isPermanentlyOpen: boolean;
	preventUserClose: boolean;
	titleRender?: () => JSX.Element;
}

export const fileTabsAtom = atom<FileTabData[]>([]);
export const activeTabKeyAtom = atom<string>('');

// ============================================================================
// UI State
// ============================================================================

// Theme state (persist to localStorage)
export const themeAtom = atomWithStorage<'light' | 'dark' | 'system'>('vite-ui-theme', 'system');

// Sidebar state
export const sidebarOpenAtom = atom<boolean>(true);
export const sidebarMobileOpenAtom = atom<boolean>(false);

// Resizable panel states (persist common layouts)
export const panelSizesAtom = atomWithStorage<Record<string, number[]>>('panel-sizes', {});

// ============================================================================
// Terminal State
// ============================================================================

export interface TerminalSession {
	id: string;
	repoPath: string;
	isActive: boolean;
	lastCommand?: string;
}

export const terminalSessionsAtom = atom<TerminalSession[]>([]);

// ============================================================================
// Git State
// ============================================================================

// Commit graph builder cache (per repo)
export const commitGraphCacheAtom = atom<Map<string, any>>(new Map());

// File diff state
export interface FileDiffData {
	file: backend.FileInfo;
	content?: {
		fileExtension: string;
		originalFilePath: string;
		originalFile: string;
		modifiedFilePath: string;
		modifiedFile: string;
	};
	loading: boolean;
}

export const fileDiffMapAtom = atom<Map<string, FileDiffData>>(new Map());

// ============================================================================
// Directory Diff State
// ============================================================================

export interface DirDiffState {
	leftPath: string;
	rightPath: string;
	files: backend.FileInfo[];
	selectedFile: backend.FileInfo | null;
	loading: boolean;
}

export const dirDiffStateAtom = atom<DirDiffState>({
	leftPath: '',
	rightPath: '',
	files: [],
	selectedFile: null,
	loading: false
});

// ============================================================================
// Recent Activity State
// ============================================================================

export interface RecentActivity {
	id: string;
	type: 'repo_opened' | 'commit_viewed' | 'file_diff_viewed';
	timestamp: number;
	data: any;
}

export const recentActivityAtom = atomWithStorage<RecentActivity[]>('recent-activity', []);

// ============================================================================
// Search and Navigation State
// ============================================================================

export const searchQueryAtom = atom<string>('');
export const navigationHistoryAtom = atom<string[]>([]);
export const currentRouteAtom = atom<string>('');
