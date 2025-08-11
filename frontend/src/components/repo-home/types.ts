// Performance-focused interfaces - only recent/fast data
export interface QuickRepoData {
	name: string;
	currentBranch: string;
	lastCommit: {
		hash: string;
		message: string;
		author: string;
		date: Date;
	};
	recentCommits: Array<{
		hash: string;
		message: string;
		author: string;
		date: Date;
		isMerge: boolean;
	}>;
	branches: Array<{
		name: string;
		isActive: boolean;
		lastCommitDate: Date;
	}>;
}