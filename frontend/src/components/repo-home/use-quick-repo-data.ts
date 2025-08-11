import { useMemo } from 'react';
import { QuickRepoData } from './types';

export function useQuickRepoData(repoPath: string) {
	// Get repository name from path
	const repoName = repoPath.split(/[/\\]/).pop() || 'Repository';

	// Performance-focused stubbed data - only what we need, only recent data
	useMemo(() => ({
		name: repoName,
		currentBranch: "main",
		lastCommit: {
			hash: "8b2a2af7c9d1e45f3a2b8c9d0e1f2a3b4c5d6e7f",
			message: "Small tweaks to the commitsToLoad field",
			author: "John Doe",
			date: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
		},
		recentCommits: [
			{
				hash: "8b2a2af7c9d1e45f3a2b8c9d0e1f2a3b4c5d6e7f",
				message: "Small tweaks to the commitsToLoad field",
				author: "John Doe",
				date: new Date(Date.now() - 1000 * 60 * 60 * 2),
				isMerge: false,
			},
			{
				hash: "d649266b8c3d9e4f5a6b7c8d9e0f1a2b3c4d5e6f",
				message: "Fixing the fetch button, and adding HEAD as always an option to view the log from",
				author: "Jane Smith", 
				date: new Date(Date.now() - 1000 * 60 * 60 * 8),
				isMerge: false,
			},
			{
				hash: "b767641c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a",
				message: "Refactor RepoDiffView and RepoHomeView components for improved state management",
				author: "Bob Wilson",
				date: new Date(Date.now() - 1000 * 60 * 60 * 24),
				isMerge: true,
			},
			{
				hash: "36d0e17a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e",
				message: "Add git difftool configuration and helper scripts",
				author: "Alice Chen",
				date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
				isMerge: false,
			},
			{
				hash: "4c601ae5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1",
				message: "Moving files to their own packages where it makes sense",
				author: "Mike Johnson",
				date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
				isMerge: false,
			},
		],
		branches: [
			{ name: "main", isActive: true, lastCommitDate: new Date(Date.now() - 1000 * 60 * 60 * 2) },
			{ name: "feature/new-ui", isActive: false, lastCommitDate: new Date(Date.now() - 1000 * 60 * 60 * 24) },
			{ name: "fix/performance", isActive: false, lastCommitDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) },
			{ name: "dev", isActive: false, lastCommitDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) },
		],
	}), [repoName]);


}