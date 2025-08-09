import { useRepoState } from '@/hooks/state/use-repo-state';
import { FolderGit2 } from 'lucide-react';
import { useEffect } from 'react';

export default function RepoFileTab(props: { repoPath: string }) {
	const { repoPath } = props;
	const repoState  = useRepoState(repoPath);

	const repoName = getRepoDisplayName(repoPath);

	useEffect(() => {
		// One-time initialization stuff
		repoState.logState.refreshLogAndRefs();

		return () => {
			// Cleanup the repo state when this tab is closed
			repoState.onCloseRepo();
		}
	}, []);

	if (!repoPath) {
		return <div>Error: No repository path provided.</div>;
	}

	return (
		<div className="flex">
			<FolderGit2 className="w-4 h-4 mr-2" />
			{repoName}
		</div>
	);
}

// Helper function to extract folder name from full path
const getRepoDisplayName = (repoPath: string): string => {
	if (!repoPath) return '';
	// Handle both Unix and Windows paths
	const pathSeparator = repoPath.includes('/') ? '/' : '\\';
	const pathParts = repoPath.split(pathSeparator);
	return pathParts[pathParts.length - 1] || repoPath;
};
