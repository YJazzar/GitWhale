import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import useCommitGraphBuilder from '@/hooks/use-commit-graph-builder';
import { useState } from 'react';
import { backend } from 'wailsjs/go/models';
import { RunGitLog } from '../../../wailsjs/go/backend/App';

import { GitLogGraph } from '@/components/git-log/git-log-graph';
import { CommitDetails } from '@/components/commit-details';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';

export default function RepoLogView() {
	const { encodedRepoPath, repoPath } = useCurrentRepoParams();
	const [logs, setLogs] = useState<backend.GitLogCommitInfo[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedCommit, setSelectedCommit] = useState<backend.GitLogCommitInfo | null>(null);

	const commitGraph = useCommitGraphBuilder(logs);

	if (!repoPath) {
		return <>Error: why are we rendering RepoLogView when there's no repo provided?</>;
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

	const onCommitSelect = (commitHash: string) => {
		const commit = logs.find(log => log.commitHash === commitHash);
		if (commit) {
			setSelectedCommit(commit);
		}
	};

	const handleCloseCommitDetails = () => {
		setSelectedCommit(null);
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
				<ResizablePanelGroup direction="vertical" className="h-full">
					<ResizablePanel defaultSize={selectedCommit ? 60 : 100} minSize={30}>
						<GitLogGraph 
							commits={logs}
							onCommitClick={onCommitSelect}
							generateCommitPageUrl={generateCommitPageUrl}
							loading={loading}
							className="border rounded-lg p-4 bg-background h-full"
						/>
					</ResizablePanel>
					
					{selectedCommit && (
						<>
							<ResizableHandle />
							<ResizablePanel defaultSize={40} minSize={20}>
								<CommitDetails 
									commit={selectedCommit}
									onClose={handleCloseCommitDetails}
								/>
							</ResizablePanel>
						</>
					)}
				</ResizablePanelGroup>
			</div>
		</div>
	);
}
