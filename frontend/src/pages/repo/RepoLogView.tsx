import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import useCommitGraphBuilder from '@/hooks/use-commit-graph-builder';
import { useEffect, useState } from 'react';
import { backend } from 'wailsjs/go/models';
import { RunGitLog } from '../../../wailsjs/go/backend/App';

import { GitLogGraph } from '@/components/git-log/git-log-graph';
import { GitLogToolbar } from '@/components/git-log/git-log-toolbar';
import { CommitDetails } from '@/components/commit-details';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';

export default function RepoLogView() {
	const { encodedRepoPath, repoPath } = useCurrentRepoParams();
	const [logs, setLogs] = useState<backend.GitLogCommitInfo[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedCommit, setSelectedCommit] = useState<backend.GitLogCommitInfo | null>(null);
	const [currentRef, setCurrentRef] = useState('HEAD');

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

	const onCommitSelect = (commitHash: string) => {
		const commit = logs.find(log => log.commitHash === commitHash);
		if (commit) {
			setSelectedCommit(commit);
		}
	};

	const handleCloseCommitDetails = () => {
		setSelectedCommit(null);
	};

	useEffect(() => {
		refreshLogs();
	}, [repoPath]);

	return (
		<div className="flex flex-col h-full">
			<GitLogToolbar
				repoPath={repoPath}
				onCommitsUpdate={setLogs}
				loading={loading}
				onLoadingChange={setLoading}
				currentRef={currentRef}
				onRefChange={setCurrentRef}
			/>
			
			<div className="flex-1 min-h-0 w-full">
				<ResizablePanelGroup direction="vertical" className="h-full">
					<ResizablePanel defaultSize={selectedCommit ? 60 : 100} minSize={30}>
						<GitLogGraph 
							commits={logs}
							onCommitClick={onCommitSelect}
							loading={loading}
							className="rounded-lg p-0 bg-background h-full"
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
