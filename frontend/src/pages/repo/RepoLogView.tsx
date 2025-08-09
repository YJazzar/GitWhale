import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

import { CommitDetails } from '@/components/commit-details';
import { GitLogGraph } from '@/components/git-log/git-log-graph';
import { GitLogToolbar } from '@/components/git-log/git-log-toolbar';
import { useRepoState } from '@/hooks/state/use-repo-state';
import { useNavigateToCommit } from '@/hooks/use-navigate-to-commit';

export default function RepoLogView({ repoPath }: { repoPath: string }) {
	const { logState } = useRepoState(repoPath);

	const handleViewFullCommit = useNavigateToCommit(repoPath);
	
	if (!repoPath) {
		return <>Error: why are we rendering RepoLogView when there's no repo provided?</>;
	}

	const onCommitSelect = (commitHash: string, shouldAddToSelection: boolean) => {
		if (shouldAddToSelection) {
			logState.selectedCommits.addToSelectedCommitsList(commitHash);
			return 
		}

		logState.selectedCommits.removeFromSelectedCommitsList(commitHash)
	};

	const onCommitDoubleClick = (commitHash: string) => {
		logState.selectedCommits.addToSelectedCommitsList(commitHash);
		handleViewFullCommit(commitHash, false)
	}

	const handleCloseCommitDetails = () => {
		onCommitSelect(selectedCommitForDetails, false)
	};

	const currentSelectedCommits = logState.selectedCommits.currentSelectedCommits
	const selectedCommitForDetails = currentSelectedCommits[currentSelectedCommits.length-1]

	return (
		<div className="flex flex-col h-full">
			<GitLogToolbar repoPath={repoPath} />

			<div className="flex-1 min-h-0 w-full">
				<ResizablePanelGroup direction="vertical" className="h-full">
					<ResizablePanel defaultSize={!!selectedCommitForDetails ? 60 : 100} minSize={30}>
						<GitLogGraph
							repoPath={repoPath}
							onCommitClick={onCommitSelect}
							onCommitDoubleClick={onCommitDoubleClick}
							className="rounded-lg p-0 bg-background h-full"
						/>
					</ResizablePanel>

					{selectedCommitForDetails && (
						<>
							<ResizableHandle />
							<ResizablePanel defaultSize={40} minSize={20}>
								<CommitDetails
									commitHash={selectedCommitForDetails}
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
