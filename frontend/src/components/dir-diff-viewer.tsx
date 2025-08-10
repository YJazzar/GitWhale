import { FileTabs, TabsManagerHandle } from '@/components/file-tabs';
import { FileTree } from '@/components/file-tree';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { GetDiffSessionKeyForFileTabManagerSession } from '@/hooks/state/repo/use-git-diff-state';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { GitCompare } from 'lucide-react';
import { useRef } from 'react';
import { EmptyState } from './empty-state';

export interface DirDiffViewerProps {
	repoPath: string;
	diffSessionID: string;
}

export function DirDiffViewer(props: DirDiffViewerProps) {
	const { repoPath, diffSessionID } = props;
	const { diffState } = useRepoState(repoPath);
	const fileTabRef = useRef<TabsManagerHandle>(null);

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

	return (
		<div className="w-full h-full flex flex-row min-h-0">
			<ResizablePanelGroup direction="horizontal">
				{/* Left pane that contains the file structure */}
				<ResizablePanel id="file-tree-panel" defaultSize={25} minSize={15}>
					<div className="border-r h-full overflow-y-auto overflow-x-hidden">
						<FileTree directoryData={diffSession.directoryData} tabManagerHandler={fileTabRef} />
					</div>
				</ResizablePanel>

				<ResizableHandle withHandle />

				{/* Right pane containing the actual diffs */}
				<ResizablePanel id="diff-content-panel">
					<div className="grow h-full flex flex-col min-h-0">
						<FileTabs
							key={diffSessionID}
							ref={fileTabRef}
							initialTabs={[]}
							fileTabManageSessionKey={GetDiffSessionKeyForFileTabManagerSession(diffSessionID)}
						/>
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
