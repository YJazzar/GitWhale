import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import useCommitGraphBuilder from '@/hooks/use-commit-graph-builder';
import { useEffect } from 'react';
import { backend } from 'wailsjs/go/models';
import { RunGitLog } from '../../../wailsjs/go/backend/App';

import { GitLogGraph } from '@/components/git-log/git-log-graph';
import { CommitDetails } from '@/components/commit-details';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';
import { useCurrentRepo, usePanelSizes } from '@/store/hooks';

export default function RepoLogView() {
	const { encodedRepoPath, repoPath } = useCurrentRepoParams();
	const { 
		commits, 
		selectedCommit, 
		loading, 
		setCommits, 
		setSelectedCommit, 
		setLoading,
		setCurrentRepoPath
	} = useCurrentRepo();
	const { getPanelSizes, savePanelSizes } = usePanelSizes();

	const commitGraph = useCommitGraphBuilder(commits);

	// Set current repo path when component mounts
	useEffect(() => {
		if (repoPath) {
			setCurrentRepoPath(repoPath);
		}
	}, [repoPath, setCurrentRepoPath]);

	if (!repoPath) {
		return <>Error: why are we rendering RepoLogView when there's no repo provided?</>;
	}

	const refreshLogs = async () => {
		setLoading(true);
		try {
			const newLogs = await RunGitLog(repoPath);
			setCommits(newLogs);
		} catch (error) {
			console.error('Failed to load git log:', error);
		} finally {
			setLoading(false);
		}
	};

	// Auto-refresh logs when component mounts if no commits are loaded
	useEffect(() => {
		if (commits.length === 0 && !loading) {
			refreshLogs();
		}
	}, [commits.length, loading]); // eslint-disable-line react-hooks/exhaustive-deps

	const generateCommitPageUrl = (commitHash: string) => {
		return `/repo/${encodedRepoPath}/commit/${commitHash}`;
	};

	const onCommitSelect = (commitHash: string) => {
		const commit = commits.find(log => log.commitHash === commitHash);
		if (commit) {
			setSelectedCommit(commit);
		}
	};

	const handleCloseCommitDetails = () => {
		setSelectedCommit(null);
	};

	const panelSizes = getPanelSizes('repo-log-view', selectedCommit ? [60, 40] : [100]);

	const handlePanelResize = (sizes: number[]) => {
		savePanelSizes('repo-log-view', sizes);
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
				<ResizablePanelGroup 
					direction="vertical" 
					className="h-full"
					onLayout={handlePanelResize}
				>
					<ResizablePanel defaultSize={panelSizes[0]} minSize={30}>
						<GitLogGraph 
							commits={commits}
							onCommitClick={onCommitSelect}
							generateCommitPageUrl={generateCommitPageUrl}
							loading={loading}
							className="border rounded-lg p-4 bg-background h-full"
						/>
					</ResizablePanel>
					
					{selectedCommit && (
						<>
							<ResizableHandle />
							<ResizablePanel defaultSize={panelSizes[1]} minSize={20}>
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
