import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { GitLogGraph } from '@/components/git-log/git-log-graph';
import { GitLogToolbar } from '@/components/git-log/git-log-toolbar';
import { useNavigateToCommit } from '@/hooks/git-log/use-navigate-to-commit';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { UseAppState } from '@/hooks/state/use-app-state';
import { ChevronUp } from 'lucide-react';
import { useEffect } from 'react';
import { CommitPreview } from '@/components/commit-preview/commit-preview';
import { usePersistentPanelSizes } from '@/hooks/use-persistent-panel-sizes';
import { useShortHash } from '@/hooks/git-log/use-short-hash';

export type CommitSelectType = 'primarySelect' | 'secondarySelect' | 'unselect';

export default function RepoLogView({ repoPath }: { repoPath: string }) {
	const { logState } = useRepoState(repoPath);
	const { appState } = UseAppState();

	const handleViewFullCommit = useNavigateToCommit(repoPath);

	// Persistent panel sizes
	const [panelSizes, setPanelSizes] = usePersistentPanelSizes('gitwhale-repo-log-panel-sizes', [60, 40]);

	if (!repoPath) {
		return <>Error: why are we rendering RepoLogView when there's no repo provided?</>;
	}

	const onCommitSelect = (commitHash: string, selectionType: CommitSelectType) => {
		if (selectionType === 'unselect') {
			logState.selectedCommits.removeFromSelectedCommitsList(commitHash);
			return;
		}

		const isSecondarySelect = selectionType === 'secondarySelect';
		logState.selectedCommits.addToSelectedCommitsList(commitHash, isSecondarySelect);

		// Auto-show commit details pane if:
		// 1. App setting allows it AND
		// 2. User hasn't manually dismissed the pane
		const autoShowSetting = appState?.appConfig?.settings?.ui?.autoShowCommitDetails ?? true;
		const userWantsPaneShown = logState.commitDetailsPane.shouldShow;

		if (autoShowSetting && userWantsPaneShown) {
			handleShowCommitDetails();
		}
	};

	const onCommitDoubleClick = (commitHash: string) => {
		logState.selectedCommits.addToSelectedCommitsList(commitHash, false);
		handleViewFullCommit(commitHash, false);
	};

	const handleCloseCommitDetails = () => {
		// Mark that user has manually dismissed the pane
		logState.commitDetailsPane.dismiss();
	};

	const handleShowCommitDetails = () => {
		// Show the commit details pane
		logState.commitDetailsPane.show();
	};

	const toggleCommitDetailsPane = () => {
		if (logState.commitDetailsPane.shouldShow) {
			handleCloseCommitDetails();
		} else {
			handleShowCommitDetails();
		}
	};

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Check for Cmd+J on Mac or Ctrl+J on Windows/Linux
			if ((event.metaKey || event.ctrlKey) && event.key === 'j') {
				event.preventDefault();
				toggleCommitDetailsPane();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [logState.commitDetailsPane]);

	const currentSelectedCommits = logState.selectedCommits.currentSelectedCommits;
	const selectedCommitForDetails = currentSelectedCommits[currentSelectedCommits.length - 1];

	// Determine if we should show the commit details pane
	const shouldShowPane = selectedCommitForDetails && logState.commitDetailsPane.shouldShow;

	// Determine if we should show the bottom indicator to re-open the pane
	const shouldShowBottomIndicator = selectedCommitForDetails && !logState.commitDetailsPane.shouldShow;
	const selectedCommitShortHash = useShortHash(selectedCommitForDetails);

	// Handle panel layout changes to persist sizes
	const handleLayoutChange = (sizes: number[]) => {
		if (shouldShowPane && sizes.length === 2) {
			setPanelSizes(sizes);
		}
	};

	return (
		<div className="flex flex-col h-full">
			<GitLogToolbar repoPath={repoPath} />

			<div className="flex-1 min-h-0 w-full relative">
				<ResizablePanelGroup direction="vertical" className="h-full" onLayout={handleLayoutChange}>
					<ResizablePanel defaultSize={shouldShowPane ? panelSizes[0] : 100} minSize={30}>
						<GitLogGraph
							repoPath={repoPath}
							onCommitClick={onCommitSelect}
							onCommitDoubleClick={onCommitDoubleClick}
							className="rounded-lg p-0 bg-background h-full"
						/>
					</ResizablePanel>

					{shouldShowPane && (
						<>
							<ResizableHandle withHandle/>
							<ResizablePanel defaultSize={panelSizes[1]} minSize={10}>
								<CommitPreview
									commitHash={selectedCommitForDetails}
									repoPath={repoPath}
									onClose={handleCloseCommitDetails}
								/>
							</ResizablePanel>
						</>
					)}
				</ResizablePanelGroup>

				{/* Bottom indicator to show commit details */}
				{shouldShowBottomIndicator && (
					<div className="absolute bottom-0 left-0 right-0 z-10">
						<Button
							variant="secondary"
							size="sm"
							onClick={handleShowCommitDetails}
							className="w-full rounded-none border-t border-l-0 border-r-0 border-b-0 bg-muted/80 backdrop-blur-sm hover:bg-muted flex items-center justify-center gap-2 h-8 text-xs font-medium shadow-lg"
						>
							<span> #{selectedCommitShortHash} - Click to view details</span>
							<ChevronUp className="w-3 h-3" />
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
