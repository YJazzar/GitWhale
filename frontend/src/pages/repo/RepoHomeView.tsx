import { Button } from '@/components/ui/button';
import { OpenNewRepo, RunGitLog } from '../../../wailsjs/go/backend/App';
import { useState } from 'react';
import { useParams } from 'react-router';
import { backend } from 'wailsjs/go/models';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';

export default function RepoHomeView() {
	const { repoPath } = useCurrentRepoParams();
	const [logs, setLogs] = useState<backend.GitLogCommitInfo[]>([]);

	if (!repoPath) {
		return <>Error: why are we rendering RepoHomeView when there's no repo provided?</>;
	}

	const refreshLogs = async () => {
		const newLogs = await RunGitLog(repoPath);
		setLogs(newLogs);
	};

	return (
		<>
			{/* <Button onClick={refreshLogs}>Refresh </Button>
			Log results:
			{logs.map((log) => {
				return (
					<div key={log.commitHash}>
						<code className="whitespace-pre-wrap">{JSON.stringify(log, null, 3)}</code>
					</div>
				);
			})} */}
		</>
	);
}
