import FileDiffView, { FileDiffViewProps } from '@/components/file-diff-view';
import { FileTabs, TabsManagerHandle } from '@/components/file-tabs';
import { TreeNode } from '@/components/tree-component';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useRepoState } from '@/hooks/state/use-repo-state';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { backend } from '../../wailsjs/go/models';
import { TabProps } from '@/hooks/state/use-file-manager-state';

const getFileKey = (file: backend.FileInfo) => {
	return `${file.Path}/${file.Name}`;
};

export function DirDiffViewer() {
	const { repoPath } = useCurrentRepoParams();
	const { diffState } = useRepoState(repoPath);
	const fileTabRef = useRef<TabsManagerHandle>(null);
	const [activeFileKey, setActiveFileKey] = useState<string>('');

	// Get directory data from the selected diff session
	const selectedSession = useMemo(() => {
		const sessions = diffState.sessions;
		const selectedId = diffState.selectedSessionId;
		return sessions.find((s) => s.sessionId === selectedId) || null;
	}, [diffState.sessions, diffState.selectedSessionId]);

	const directoryData = selectedSession?.directoryData || null;

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

	// Get active tab key from session state
	const sessionActiveTabKey = useMemo(() => {
		if (!selectedSession) return undefined;
		const sessionTabState = diffState.getTabState(selectedSession.sessionId);
		return sessionTabState.activeTabKey;
	}, [selectedSession, diffState]);

	const handleTabChange = useCallback((tabKey: string) => {
		setActiveFileKey(tabKey);
	}, []);

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
							ref={fileTabRef}
							initialTabs={[]}
							fileTabManageSessionKey={`diff-session-${repoPath}`}
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
			component: <FileDiffView file={file}/>,
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
