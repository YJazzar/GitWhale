import { Button } from '@/components/ui/button';
import useCommitGraphBuilder from '@/hooks/use-commit-graph-builder';
import { useState } from 'react';
import { useParams } from 'react-router';
import { backend } from 'wailsjs/go/models';
import { RunGitLog } from '../../../wailsjs/go/backend/App';

import { GitLogGraph } from '@/components/git-log/git-log-graph';
import { useRepoPageHandlers } from '@/hooks/repo-page-handler-context';
import { GitCommitVertical } from 'lucide-react';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';

export default function RepoLogView() {
	const { encodedRepoPath, repoPath } = useCurrentRepoParams();
	const repoPageHandlers = useRepoPageHandlers();
	const [logs, setLogs] = useState<backend.GitLogCommitInfo[]>([]);
	const [loading, setLoading] = useState(false);

	const commitGraph = useCommitGraphBuilder(logs);

	if (!repoPath) {
		return <>Error: why are we rendering RepoHomeView when there's no repo provided?</>;
	}

	const refreshLogs = async () => {
		setLoading(true);
		try {
			const newLogs = await RunGitLog(repoPath);
			setLogs(newLogs);
		} catch (error) {
			console.error('Failed to load git log:', error);
		} finally {
			setLoading(false);
		}
	};

	const generateCommitPageUrl = (commitHash: string) => {
		return `/repo/${encodedRepoPath}/commit/${commitHash}`;
	};

	const onOpenCommitPage = (commitHash: string) => {
		repoPageHandlers?.onAddNewDynamicRoute({
			icon: <GitCommitVertical />,
			title: commitHash.slice(0, 7),
			url: generateCommitPageUrl(commitHash),
		});
	};

	return (
		<div className="flex flex-col gap-4 p-4 h-full">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Git Log</h2>
				<Button onClick={refreshLogs} disabled={loading}>
					{loading ? 'Loading...' : 'Refresh'}
				</Button>
			</div>
			
			<div className="flex-1 min-h-0 w-full">
				<GitLogGraph 
					commits={logs}
					onCommitClick={onOpenCommitPage}
					generateCommitPageUrl={generateCommitPageUrl}
					loading={loading}
					className="border rounded-lg p-4 bg-background h-full"
				/>
			</div>
		</div>
	);
}
