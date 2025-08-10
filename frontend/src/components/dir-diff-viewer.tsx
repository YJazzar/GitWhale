import FileDiffView, { FileDiffViewProps } from '@/components/file-diff-view';
import { FileTabs, TabsManagerHandle } from '@/components/file-tabs';
import { TreeNode } from '@/components/tree-component';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { TabProps } from '@/hooks/state/use-file-manager-state';
import React, { useEffect, useMemo, useRef } from 'react';
import { git_operations } from '../../wailsjs/go/models';
import { EmptyState } from './empty-state';
import { GitCompare } from 'lucide-react';
import { GetDiffSessionKeyForFileTabManagerSession } from '@/hooks/state/repo/use-git-diff-state';

const getFileKey = (file: git_operations.FileInfo) => {
	return `${file.Path}/${file.Name}`;
};

export interface DirDiffViewerProps {
	repoPath: string;
	diffSessionID: string;
}

export function DirDiffViewer(props: DirDiffViewerProps) {
	const { repoPath, diffSessionID } = props;
	const { diffState } = useRepoState(repoPath);
	const fileTabRef = useRef<TabsManagerHandle>(null);

	const diffSession = diffState.sessionData.find((s) => s.sessionId === diffSessionID);
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
						<FileTree tabManagerHandler={fileTabRef} directoryData={diffSession.directoryData} />
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

// TODO: generalize and move this to it's own file?
export function FileTree(props: {
	tabManagerHandler: React.RefObject<TabsManagerHandle>;
	directoryData: git_operations.Directory;
}) {
	const { directoryData, tabManagerHandler } = props;

	const onOpenFile = (file: git_operations.FileInfo, keepFileOpen: boolean) => {
		const tabKey = getFileKey(file);

		const fileDiffViewProps: FileDiffViewProps = {
			file,
		};

		let fileToOpen: TabProps = {
			tabKey: tabKey,
			titleRender: () => <>{file.Name}</>,
			component: <FileDiffView file={file} />,
			isPermanentlyOpen: keepFileOpen,
		};

		tabManagerHandler.current?.openTab(fileToOpen);
		if (keepFileOpen) {
			tabManagerHandler.current?.setTabPermaOpen(fileToOpen);
		}
	};

	return (
		<div className="w-full h-full p-2 overflow-y-auto">
			<TreeNode directory={directoryData} onFileClick={onOpenFile} />
		</div>
	);
}
