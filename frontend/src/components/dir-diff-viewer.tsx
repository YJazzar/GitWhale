import FileDiffView, { FileDiffViewProps } from '@/components/file-diff-view';
import { FileTabs, TabsManagerHandle } from '@/components/file-tabs';
import { TreeNode } from '@/components/tree-component';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useRepoState } from '@/hooks/state/use-repo-state';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { backend } from '../../wailsjs/go/models';
import { TabProps } from '@/hooks/state/use-file-manager-state';
import Logger from '@/utils/logger';

const getFileKey = (file: backend.FileInfo) => {
	return `${file.Path}/${file.Name}`;
};

export function DirDiffViewer(props: { repoPath: string }) {
	const { repoPath } = props;
	const { diffState } = useRepoState(repoPath);
	const fileTabRef = useRef<TabsManagerHandle>(null);

	const directoryData = diffState.selectedSession?.directoryData || null;

	// Force FileTabs to remount when session changes by using session ID as key
	const sessionKey = diffState.selectedSessionId || 'none';

	const fileInfoMap = useMemo(() => {
		const map: Map<string, backend.FileInfo> = new Map();

		const recurseDir = (dir: backend.Directory) => {
			// Add the current files
			dir.Files.forEach((file) => {
				map.set(getFileKey(file), file);
			});

			dir.SubDirs.forEach((subDir) => {
				recurseDir(subDir);
			});
		};

		if (directoryData) {
			recurseDir(directoryData);
		}

		return map;
	}, [directoryData]);

	// Store fileInfoMap in state for components to access
	useEffect(() => {
		if (diffState.fileInfoMap !== fileInfoMap) {
			diffState.setFileInfoMap(fileInfoMap);
		}
	}, [fileInfoMap, diffState]);

	if (!directoryData) {
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
						<FileTree tabManagerHandler={fileTabRef} directoryData={directoryData} />
					</div>
				</ResizablePanel>

				<ResizableHandle withHandle />

				{/* Right pane containing the actual diffs */}
				<ResizablePanel id="diff-content-panel">
					<div className="grow h-full flex flex-col min-h-0">
						<FileTabs
							key={sessionKey}
							ref={fileTabRef}
							initialTabs={[]}
							fileTabManageSessionKey={`diff-session-${sessionKey}`}
						/>
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}

export function NoFileSelected() {
	return (
		<div className="w-full h-full grid place-content-center">
			<div className="text-center text-muted-foreground">
				<p>Select a file to view diff</p>
			</div>
		</div>
	);
}

function FileTree(props: {
	tabManagerHandler: React.RefObject<TabsManagerHandle>;
	directoryData: backend.Directory;
}) {
	const { directoryData, tabManagerHandler } = props;

	const onOpenFile = (file: backend.FileInfo, keepFileOpen: boolean) => {
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
