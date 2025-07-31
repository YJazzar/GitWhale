import { useMemo } from 'react';
import { backend } from 'wailsjs/go/models';
import { useCommitGraphCache, useCurrentRepo } from '@/store/hooks';

type LinkedCommitInfo = {
	parentCommits: LinkedCommitInfo[]; // The "older" commits
	childCommits: LinkedCommitInfo[];
	commitInfo: backend.GitLogCommitInfo;
};

export default function useCommitGraphBuilder(commits: backend.GitLogCommitInfo[] | undefined) {
	const { currentRepoPath } = useCurrentRepo();
	const { getCachedGraph, setCachedGraph } = useCommitGraphCache();

	return useMemo(() => {
		if (!commits || commits.length < 1) {
			return undefined;
		}

		// Create a cache key based on commit hashes
		const cacheKey = `${currentRepoPath}-${commits.map(c => c.commitHash).join(',')}`;
		
		// Check if we have a cached result
		const cached = getCachedGraph(cacheKey);
		if (cached) {
			return cached;
		}

		// Problem: how do i find the "head". Is it always the first commit in the array?
		const linkedCommitsMap = new Map<string, LinkedCommitInfo>();

		// Start at the "oldest" commit, which I would expect to be at the end of the array
		for (let i = commits.length - 1; i >= 0; i--) {
			const currentCommit = commits[i];

			const newLinkedCommit: LinkedCommitInfo = {
				parentCommits: [],
				childCommits: [],
				commitInfo: currentCommit,
			};

			// Link any parent commits to the current commit (if any)
			currentCommit.parentCommitHashes.forEach((parentHash) => {
				const parentLinkedCommit = linkedCommitsMap.get(parentHash);
				if (!parentLinkedCommit) {
					return;
				}

				// Add the parent linkage
				newLinkedCommit.parentCommits.push(parentLinkedCommit);

				// Add the child linkage
				parentLinkedCommit.childCommits.push(newLinkedCommit)
			});

			// Add the new commit to the map
			linkedCommitsMap.set(currentCommit.commitHash, newLinkedCommit);
		}

		const result = linkedCommitsMap.get(commits[0].commitHash);
		
		// Cache the result for next time
		setCachedGraph(cacheKey, result);
		
		return result;
	}, [commits, currentRepoPath, getCachedGraph, setCachedGraph]);
}
