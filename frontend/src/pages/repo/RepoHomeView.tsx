import { Button } from '@/components/ui/button';
import { OpenNewRepo, RunGitLog } from '../../../wailsjs/go/backend/App';
import { useEffect } from 'react';
import { useParams } from 'react-router';
import { backend } from 'wailsjs/go/models';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';
import { useCurrentRepo } from '@/store/hooks';

export default function RepoHomeView() {
	const { repoPath } = useCurrentRepoParams();
	const { commits, setCommits, setCurrentRepoPath } = useCurrentRepo();

	// Set current repo path when component mounts
	useEffect(() => {
		if (repoPath) {
			setCurrentRepoPath(repoPath);
		}
	}, [repoPath, setCurrentRepoPath]);

	if (!repoPath) {
		return <>Error: why are we rendering RepoHomeView when there's no repo provided?</>;
	}

	const refreshLogs = async () => {
		const newLogs = await RunGitLog(repoPath);
		setCommits(newLogs);
	};

	return (
		<>
			{/* <Button onClick={refreshLogs}>Refresh </Button>
			Log results:
			{commits.map((log) => {
				return (
					<div key={log.commitHash}>
						<code className="whitespace-pre-wrap">{JSON.stringify(log, null, 3)}</code>
					</div>
				);
			})} */}
		</>
	);
}
