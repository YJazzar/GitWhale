import React, { useMemo, useRef, useEffect } from 'react';
import FileDiffView from '@/components/file-diff-view';
import { FileTabPageProps, FileTabs, FileTabsHandle } from '@/components/file-tabs';
import { TreeNode } from '@/components/tree-component';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Outlet, useParams } from 'react-router';
import { backend } from '../../wailsjs/go/models';
import { useRepoState } from '@/hooks/state/use-repo-state';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';

const getFileKey = (file: backend.FileInfo) => {
	return `${file.Path}/${file.Name}`;
};

export function DirDiffViewer() {
	const { repoPath } = useCurrentRepoParams();
	const { diffState } = useRepoState(repoPath);
	const fileTabRef = useRef<FileTabsHandle>(null);

	// Get directory data from the selected diff session
	const selectedSession = useMemo(() => {
		const sessions = diffState.sessions;
		const selectedId = diffState.selectedSessionId;
		return sessions.find(s => s.sessionId === selectedId) || null;
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

	// Store fileInfoMap in state for FileDiffViewWrapper to access
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
						<FileTree fileTreeRef={fileTabRef} directoryData={directoryData} />
					</div>
				</ResizablePanel>

				<ResizableHandle withHandle />

				{/* Right pane containing the actual diffs */}
				<ResizablePanel id="diff-content-panel">
					<div className="grow h-full flex flex-col min-h-0">
						<FileTabs
							ref={fileTabRef}
							defaultTabKey=""
							initialPages={[]}
							noTabSelectedPath="./no-file-selected"
							routerConfig={() => {
								return (
									<Outlet/>
								);
							}}
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

// Gets the file to render from react-router, and renders the actual diff view
export function FileDiffViewWrapper() {
	const { repoPath } = useCurrentRepoParams();
	const { diffState } = useRepoState(repoPath);
	const { tabKey } = useParams();

	const fileInfo = useMemo(() => {
		if (!tabKey) {
			return undefined;
		}

		const fileInfoMap = diffState.fileInfoMap;
		if (!fileInfoMap) {
			return undefined;
		}

		return fileInfoMap.get(atob(tabKey));
	}, [tabKey, diffState.fileInfoMap]);

	if (!fileInfo) {
		return <div className="w-full h-full grid place-content-center text-muted-foreground">No file was selected</div>;
	}

	return <FileDiffView file={fileInfo} />;
}

function FileTree(props: { fileTreeRef: React.RefObject<FileTabsHandle>; directoryData: backend.Directory }) {
	const { directoryData } = props;

	const onOpenFile = (file: backend.FileInfo, keepFileOpen: boolean) => {
		const tabKey = getFileKey(file);
		let fileToOpen: FileTabPageProps = {
			tabKey: tabKey,
			titleRender: () => <>{file.Name}</>,
			isPermanentlyOpen: keepFileOpen,
			linkPath: `./${btoa(tabKey)}`,
		};
		props.fileTreeRef.current?.openFile(fileToOpen);
		if (keepFileOpen) {
			props.fileTreeRef.current?.setFilePermaOpen(fileToOpen);
		}
	};

	return (
		<div className="w-full h-full p-2 overflow-y-auto">
			<TreeNode directory={directoryData} onFileClick={onOpenFile} />
		</div>
	);
}