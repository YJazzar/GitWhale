import { useParams } from 'react-router';

export function useCurrentRepoParams() {
	const { encodedRepoPath, commitHash } = useParams();
	const repoPath = atob(encodedRepoPath ?? '');

	return { encodedRepoPath, repoPath, commitHash}
}
