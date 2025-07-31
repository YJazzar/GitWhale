import { GitCommit, GitMerge } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useRepoPageHandlers } from './repo-page-handler-context';
import { useCurrentRepoParams } from './use-current-repo';

export function useNavigateToCommit(commitHash: string, isMergeCommit: boolean): () => void {
	const { encodedRepoPath } = useCurrentRepoParams();
	const repoPageHandlers = useRepoPageHandlers();
	const navigate = useNavigate();

	const commitUrl = `/repo/${encodedRepoPath}/commit/${commitHash}`;

	const handleViewFullCommit = () => {
		// add it to the sidebar first
		console.log(repoPageHandlers);
		repoPageHandlers?.onAddNewDynamicRoute({
			icon: isMergeCommit ? <GitMerge /> : <GitCommit />,
			title: commitHash.slice(0, 7),
			url: commitUrl,
		});

		navigate(commitUrl);
	};

	return handleViewFullCommit;
}
