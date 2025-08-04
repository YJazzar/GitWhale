import { GitCommit, GitMerge } from 'lucide-react';
import { backend } from 'wailsjs/go/models';
import { CommitDetails } from '@/components/commit-details';

export function useNavigateToCommit(commitHash: string, isMergeCommit: boolean): () => void {
	// const handleViewFullCommit = () => {
	// 	// Create a commit object for the details view
	// 	const commit: backend.GitLogCommitInfo = {
	// 		commitHash,
	// 		username: '',
	// 		userEmail: '',
	// 		commitTimeStamp: '',
	// 		authoredTimeStamp: '',
	// 		parentCommitHashes: [],
	// 		refs: '',
	// 		commitMessage: [],
	// 		shortStat: '',
	// 	};

	// 	// Add dynamic tab via global API
	// 	const addRepoViewTab = (window as any).addRepoViewTab;
	// 	if (addRepoViewTab) {
	// 		addRepoViewTab({
	// 			id: `commit-${commitHash}`,
	// 			title: commitHash.slice(0, 7),
	// 			icon: isMergeCommit ? <GitMerge className="h-4 w-4" /> : <GitCommit className="h-4 w-4" />,
	// 			component: <CommitDetails commit={commit} onClose={() => {}} />,
	// 			onClose: () => {
	// 				console.log(`Closing commit view for ${commitHash}`);
	// 			},
	// 		});
	// 	}
	// };

	// return handleViewFullCommit;
	return () => {}
}
