/**
 * Utilities for syncing router state with global state
 * This helps track current route and navigation history automatically
 */

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useNavigation, useRecentActivity, useCurrentRepo } from './hooks';

/**
 * Hook that automatically syncs router state with global navigation state
 * Call this in your main App component or route wrapper
 */
export function useRouterSync() {
	const location = useLocation();
	const { setCurrentRoute, addToHistory } = useNavigation();
	const { addActivity } = useRecentActivity();
	const { setCurrentRepoPath } = useCurrentRepo();

	useEffect(() => {
		// Update current route
		setCurrentRoute(location.pathname);
		
		// Add to navigation history
		addToHistory(location.pathname);
		
		// Track page view activity
		addActivity({
			type: 'repo_opened',
			data: { 
				path: location.pathname,
				search: location.search,
				timestamp: Date.now()
			}
		});

		// Extract repo path from URL if it's a repo route
		const repoMatch = location.pathname.match(/\/repo\/([^\/]+)/);
		if (repoMatch) {
			try {
				const decodedRepoPath = atob(repoMatch[1]);
				setCurrentRepoPath(decodedRepoPath);
			} catch (error) {
				console.warn('Failed to decode repo path from URL:', repoMatch[1]);
			}
		}
	}, [location, setCurrentRoute, addToHistory, addActivity, setCurrentRepoPath]);
}

/**
 * Hook for programmatic navigation with state tracking
 */
export function useNavigateWithTracking() {
	const navigate = useNavigate();
	const { addActivity } = useRecentActivity();

	return (to: string, options?: { replace?: boolean; state?: any }) => {
		// Track navigation activity
		addActivity({
			type: 'repo_opened',
			data: { 
				navigatedTo: to,
				timestamp: Date.now(),
				programmatic: true
			}
		});

		navigate(to, options);
	};
}

/**
 * Hook that provides navigation utilities with state awareness
 */
export function useSmartNavigation() {
	const navigate = useNavigate();
	const location = useLocation();
	const { navigationHistory } = useNavigation();
	const { addActivity } = useRecentActivity();

	const goBack = () => {
		if (navigationHistory.length > 1) {
			const previousRoute = navigationHistory[1];
			navigate(previousRoute);
		} else {
			navigate(-1);
		}
	};

	const goToCommit = (repoPath: string, commitHash: string) => {
		const encodedRepoPath = btoa(repoPath);
		const url = `/repo/${encodedRepoPath}/commit/${commitHash}`;
		
		addActivity({
			type: 'commit_viewed',
			data: { commitHash, repoPath }
		});
		
		navigate(url);
	};

	const goToRepo = (repoPath: string, subRoute = 'log') => {
		const encodedRepoPath = btoa(repoPath);
		const url = `/repo/${encodedRepoPath}/${subRoute}`;
		
		addActivity({
			type: 'repo_opened',
			data: { repoPath }
		});
		
		navigate(url);
	};

	const isCurrentRoute = (path: string) => {
		return location.pathname === path;
	};

	const isInRepo = (repoPath?: string) => {
		if (!repoPath) return location.pathname.startsWith('/repo/');
		
		const encodedRepoPath = btoa(repoPath);
		return location.pathname.includes(`/repo/${encodedRepoPath}`);
	};

	return {
		goBack,
		goToCommit,
		goToRepo,
		isCurrentRoute,
		isInRepo,
		currentPath: location.pathname,
		navigationHistory
	};
}
