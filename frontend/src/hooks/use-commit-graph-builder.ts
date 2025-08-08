import { git_operations } from 'wailsjs/go/models';

type LinkedCommitInfo = {
	parentCommits: LinkedCommitInfo[]; // The "older" commits
	childCommits: LinkedCommitInfo[];
	commitInfo: git_operations.GitLogCommitInfo;
};

export default function useCommitGraphBuilder(commits: git_operations.GitLogCommitInfo[] | undefined) {
	if (!commits || commits.length < 1) {
		return undefined;
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

	return linkedCommitsMap.get(commits[0].commitHash);
}
