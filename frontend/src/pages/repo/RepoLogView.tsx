import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

import { CommitDetails } from '@/components/commit-details';
import { GitLogGraph } from '@/components/git-log/git-log-graph';
import { GitLogToolbar } from '@/components/git-log/git-log-toolbar';
import { useRepoState } from '@/hooks/state/use-repo-state';

export default function RepoLogView({ repoPath }: { repoPath: string }) {
	const { logState } = useRepoState(repoPath);

	if (!repoPath) {
		return <>Error: why are we rendering RepoLogView when there's no repo provided?</>;
	}

	const refreshLogs = async () => {
		await logState.refreshLogAndRefs();
	};

	const onCommitSelect = (commitHash: string) => {
		logState.selectedCommit.set(commitHash);
	};

	const handleCloseCommitDetails = () => {
		logState.selectedCommit.set(null);
	};

	const selectedCommitForDetails = logState.selectedCommit.get() 

	return (
		<div className="flex flex-col h-full">
			<GitLogToolbar repoPath={repoPath} />

			<div className="flex-1 min-h-0 w-full">
				<ResizablePanelGroup direction="vertical" className="h-full">
					<ResizablePanel defaultSize={logState.selectedCommit ? 60 : 100} minSize={30}>
						<GitLogGraph
							repoPath={repoPath}
							onCommitClick={onCommitSelect}
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
