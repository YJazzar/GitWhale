import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import useCommitGraphBuilder from '@/hooks/use-commit-graph-builder';
import { useEffect, useState } from 'react';
import { backend } from 'wailsjs/go/models';
import { RunGitLog } from '../../../wailsjs/go/backend/App';

import { GitLogGraph } from '@/components/git-log/git-log-graph';
import { GitLogToolbar } from '@/components/git-log/git-log-toolbar';
import { CommitDetails } from '@/components/commit-details';
import { useRepoState } from '@/hooks/state/use-repo-state';
import { Logger } from '@/utils/logger';

export default function RepoLogView({ repoPath }: { repoPath: string }) {
	const { logState } = useRepoState(repoPath);
	const [loading, setLoading] = useState(false);

	const commitGraph = useCommitGraphBuilder(logState.logs);

	if (!repoPath) {
		return <>Error: why are we rendering RepoLogView when there's no repo provided?</>;
	}

	const refreshLogs = async () => {
		setLoading(true);
		try {
			const newLogs = await RunGitLog(repoPath);
			logState.setLogs(newLogs);
		} catch (error) {
			Logger.error(`Failed to load git log: ${error}`, 'RepoLogView');
		} finally {
			setLoading(false);
		}
	};

	const onCommitSelect = (commitHash: string) => {
		const commit = logState.logs.find(log => log.commitHash === commitHash);
		if (commit) {
			logState.setSelectedCommit(commit);
		}
	};

	const handleCloseCommitDetails = () => {
		logState.setSelectedCommit(null);
	};
	
	useEffect(() => {
		// Only refresh if we don't already have logs for this repo
		if (logState.logs.length === 0) {
			refreshLogs();
		}
	}, [repoPath]);

	return (
		<div className="flex flex-col h-full">
			<GitLogToolbar
				repoPath={repoPath}
				onCommitsUpdate={logState.setLogs}
				loading={loading}
				onLoadingChange={setLoading}
				currentRef={logState.currentRef}
				onRefChange={logState.setCurrentRef}
			/>
			
			<div className="flex-1 min-h-0 w-full">
				<ResizablePanelGroup direction="vertical" className="h-full">
					<ResizablePanel defaultSize={logState.selectedCommit ? 60 : 100} minSize={30}>
						<GitLogGraph 
							commits={logState.logs}
							onCommitClick={onCommitSelect}
							loading={loading}
							className="rounded-lg p-0 bg-background h-full"
						/>
					</ResizablePanel>
					
					{logState.selectedCommit && (
						<>
							<ResizableHandle />
							<ResizablePanel defaultSize={40} minSize={20}>
								<CommitDetails 
									commitHash={logState.selectedCommit.commitHash}
									repoPath={repoPath}
									onClose={handleCloseCommitDetails}
									variant="compact"
								/>
							</ResizablePanel>
						</>
					)}
				</ResizablePanelGroup>
			</div>
		</div>
	);
}
