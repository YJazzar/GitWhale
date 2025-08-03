import React, { useMemo, useRef, useEffect } from 'react';
import FileDiffView from '@/components/file-diff-view';
import { FileTabPageProps, FileTabs, FileTabsHandle } from '@/components/file-tabs';
import LoadingSpinner from '@/components/loading-spinner';
import { TreeNode } from '@/components/tree-component';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Navigate, Route, Routes, useParams } from 'react-router';
import { backend } from '../../wailsjs/go/models';

interface DirDiffViewerProps {
	directoryData: backend.Directory | null;
	isLoading?: boolean;
	isError?: boolean;
	error?: any;
	onAddFile?: (file: backend.FileInfo) => void;
	title?: string;
	emptyMessage?: string;
}

const getFileKey = (file: backend.FileInfo) => {
	return `${file.Path}/${file.Name}`;
};

export function DirDiffViewer({
	directoryData,
	isLoading = false,
	isError = false,
	error = null,
	onAddFile,
	title = "Directory Diff",
	emptyMessage = "Select a file to view diff"
}: DirDiffViewerProps) {
	const fileTabRef = useRef<FileTabsHandle>(null);

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

	// Listen for additional files to diff (for external notifications)
	useEffect(() => {
		// Note: We can't use EventsOn here since we don't have access to the 
		// Wails runtime context in a reusable component. The parent component
		// should handle events and pass files via onAddFile.
		
		// This is just a placeholder for potential future event handling
	}, [onAddFile]);

	if (isLoading) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				<LoadingSpinner />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				<div className="text-center">
					<h3 className="text-lg font-medium text-destructive mb-2">Error Loading Diff</h3>
					<pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4 text-sm">
						<code className="text-white">{JSON.stringify(error, null, 2)}</code>
					</pre>
				</div>
			</div>
		);
	}

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
		<div className="w-full h-full flex flex-col">
			{/* Optional title header */}
			{title && (
				<div className="border-b p-3 bg-muted/30">
					<h3 className="text-lg font-medium">{title}</h3>
				</div>
			)}
			
			<div className="flex-1 flex flex-row">
				<ResizablePanelGroup direction="horizontal">
					{/* Left pane that contains the file structure */}
					<ResizablePanel id="file-tree-panel" defaultSize={25} minSize={15}>
						<div className="border-r h-full overflow-y-auto">
							<FileTree fileTreeRef={fileTabRef} directoryData={directoryData} />
						</div>
					</ResizablePanel>

					<ResizableHandle withHandle />

					{/* Right pane containing the actual diffs */}
					<ResizablePanel id="diff-content-panel">
						<div className="grow h-full flex flex-col">
							<FileTabs
								ref={fileTabRef}
								defaultTabKey=""
								initialPages={[]}
								noTabSelectedPath="no-file-selected"
								routerConfig={() => {
									return (
										<Routes>
											<Route path="/" element={<Navigate to="no-file-selected" />} />
											<Route path="no-file-selected" element={<NoFileSelected message={emptyMessage} />} />
											<Route
												path=":tabKey"
												element={<FileDiffViewWrapper fileInfoMap={fileInfoMap} />}
											/>
										</Routes>
									);
								}}
							/>
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</div>
		</div>
	);
}

function NoFileSelected({ message }: { message: string }) {
	return (
		<div className="w-full h-full grid place-content-center">
			<div className="text-center text-muted-foreground">
				<p>{message}</p>
			</div>
		</div>
	);
}

// Gets the file to render from react-router, and renders the actual diff view
function FileDiffViewWrapper(props: { fileInfoMap: Map<string, backend.FileInfo> }) {
	const { fileInfoMap } = props;
	const { tabKey } = useParams();

	const fileInfo = useMemo(() => {
		if (!tabKey) {
			return undefined;
		}

		return fileInfoMap.get(atob(tabKey));
	}, [tabKey, fileInfoMap]);

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
			linkPath: btoa(tabKey),
		};
		props.fileTreeRef.current?.openFile(fileToOpen);
		if (keepFileOpen) {
			props.fileTreeRef.current?.setFilePermaOpen(fileToOpen);
		}
	};

	return (
		<div className="w-full h-full p-2">
			<TreeNode directory={directoryData} onFileClick={onOpenFile} />
		</div>
	);
}