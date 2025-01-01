import { Button } from '@/components/ui/button';
import { OpenNewRepo, RunGitLog } from '../../../wailsjs/go/backend/App';
import { useState } from 'react';
import { useParams } from 'react-router';
import { backend } from 'wailsjs/go/models';

export default function RepoCommitDetailsView() {
	const { encodedRepoPath, commitHash } = useParams();
	const [logs, setLogs] = useState<backend.GitLogCommitInfo[]>([]);

	if (!encodedRepoPath) {
		return <>Error: why are we rendering RepoHomeView when there's no repo provided?</>;
	}

	const repoPath = atob(encodedRepoPath);

	const refreshLogs = async () => {
		const newLogs = await RunGitLog(repoPath);
		setLogs(newLogs);
	};

	return (
		<>
			<Button onClick={refreshLogs}>Refresh </Button>
			This is the details view for {commitHash}
			{logs.map((log) => {
				return (
					<div key={log.commitHash}>
						<code className="whitespace-pre-wrap">{JSON.stringify(log, null, 3)}</code>
					</div>
				);
			})}
		</>
	);
}
