import { EmptyState } from '@/components/empty-state';
import { FileTabs } from '@/components/file-tabs';
import { CommitPager } from '@/components/git-diff/commit-pager';
import { FileTree } from '@/components/git-diff/file-tree';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Separator } from '@/components/ui/separator';
import { GetDiffSessionKeyForFileTabManagerSession } from '@/hooks/state/repo/use-git-diff-state';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { usePersistentPanelSizes } from '@/hooks/use-persistent-panel-sizes';
import { GitCompare } from 'lucide-react';

interface RepoCommitDiffViewProps {
	repoPath: string;
	diffSessionID: string;
}

export default function RepoCommitDiffView(props: RepoCommitDiffViewProps) {
	const { repoPath, diffSessionID } = props;
	const { diffState } = useRepoState(repoPath);

	// Persistent panel sizes for file tree (left) and diff content (right)
	const [panelSizes, setPanelSizes] = usePersistentPanelSizes(
		'gitwhale-dir-diff-panel-sizes',
		[25, 75] // file-tree: 25%, diff-content: 75%
	);

	const diffSession = diffState.sessionsData.find((s) => s.sessionId === diffSessionID);
	if (!diffSession || !diffSession.directoryData) {
		return (
			<EmptyState
				title={() => {
					return (
						<>
							<GitCompare className="w-5 h-5" />
							Could not load diff data
						</>
					);
				}}
				message="No directory diff data is available for display."
			/>
		);
	}

	if (!diffSession.directoryData) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				<div className="text-center text-muted-foreground">
					<p>No diff data available</p>
				</div>
			</div>
		);
	}

	// Handle panel layout changes to persist sizes
	const handleLayoutChange = (sizes: number[]) => {
		if (sizes.length === 2) {
			setPanelSizes(sizes);
		}
	};

	return (
		<div className="w-full h-full flex flex-row min-h-0">
			<ResizablePanelGroup direction="horizontal" onLayout={handleLayoutChange}>
				{/* Left pane that contains the file structure */}
				<ResizablePanel id="file-tree-panel" defaultSize={panelSizes[0]} minSize={15}>
					<div className="border-r h-full overflow-y-auto overflow-x-hidden flex flex-col">
						<FileTree
							className="flex-grow"
							directoryData={diffSession.directoryData}
							fileTabsSessionKey={GetDiffSessionKeyForFileTabManagerSession(diffSessionID)}
						/>

						{diffSession.commitInformation && (<>
							<Separator/>
							<CommitPager repoPath={repoPath} commitData={diffSession.commitInformation} />
						</>
						)}
					</div>
				</ResizablePanel>

				<ResizableHandle withHandle />

				{/* Right pane containing the actual diffs */}
				<ResizablePanel id="diff-content-panel" defaultSize={panelSizes[1]}>
					<div className="grow h-full flex flex-col min-h-0">
						<FileTabs
							key={diffSessionID}
							initialTabs={[]}
							fileTabManageSessionKey={GetDiffSessionKeyForFileTabManagerSession(diffSessionID)}
						/>
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
