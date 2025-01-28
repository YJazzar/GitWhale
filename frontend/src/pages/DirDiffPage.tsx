import FileDiffView from '@/components/file-diff-view';
import { FileTabPageProps, FileTabs, FileTabsHandle } from '@/components/file-tabs';
import LoadingSpinner from '@/components/loading-spinner';
import { TreeNode } from '@/components/tree-component';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useEffect, useMemo, useRef, useState } from 'react';
import { isError, useQuery } from 'react-query';
import { GetDirectoryDiffDetails } from '../../wailsjs/go/backend/App';
import { backend } from '../../wailsjs/go/models';
import { Navigate, Route, Routes, useParams } from 'react-router';
import { EventsOff, EventsOn } from '../../wailsjs/runtime/runtime';


const getFileKey = (file: backend.FileInfo) => {
	return `${file.Path}/${file.Name}`;
};

export default function DirDiffPage() {
	const fileTreeData = useDiffFileTreeData()

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

		if (fileTreeData.data) {
			recurseDir(fileTreeData.data);
		}

		return map;
	}, [fileTreeData]);

	const onAddNewFileToDiff = (event: backend.FileInfo) => {
		fileTreeData.onAddFile?.(event)
	};

	// Listen in to any additional files we may need to diff later on:
	useEffect(() => {
		EventsOn(`onOpenNewFileDiff`, onAddNewFileToDiff);
		return () => {
			EventsOff('onOpenNewFileDiff');
		};
	});

	if (fileTreeData.isLoading || !fileTreeData.data) {
		return <LoadingSpinner />;
	}

	if (fileTreeData.isError) {
		return (
			<>
				Error....{' '}
				<pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
					<code className="text-white">{JSON.stringify(fileTreeData, null, 2)}</code>
				</pre>{' '}
			</>
		);
	}

	// return <>test</>

	return (
		<>
			<div className="w-full h-full flex flex-row ">
				<ResizablePanelGroup direction="horizontal">
					{/* Left pane that contains the file structure */}
					<ResizablePanel defaultSize={20}>
						{/* <ScrollArea className="h-screen "> */}
						<div className=" border h-screen overflow-y-auto">
							<FileTree fileTreeRef={fileTabRef} directoryData={fileTreeData.data} />
						</div>
						{/* </ScrollArea> */}
					</ResizablePanel>

					<ResizableHandle withHandle />

					{/* Right pain containing the actual diffs */}
					<ResizablePanel>
						<div className="grow border h-screen flex flex-col">
							<FileTabs
								ref={fileTabRef}
								defaultTabKey=""
								initialPages={
									[
										// {
										// 	tabKey: 'fileTree',
										// 	render: () => {
										// 		return <FileTree fileTreeRef={fileTabRef} />;
										// 	},
										// 	title: 'Files',
										// 	preventUserClose: true
										// },
									]
								}
								noTabSelectedPath="/DirDiffHome"
								routerConfig={() => {
									return (
										<Routes>
											<Route path="/" element={<Navigate to={'/DirDiffHome'} />} />
											<Route path="/DirDiffHome" element={<NoFileSelected />} />
											<Route
												path="/:tabKey"
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
		</>
	);
}

function useDiffFileTreeData() { 
	const directoryDiffDetails = useQuery({
		queryKey: ['GetDirectoryDiffDetails'],
		queryFn: GetDirectoryDiffDetails,
	});

	const [fileTreeData, setFileTreeData] = useState<backend.Directory | undefined>(undefined)
	useEffect(() => { 
		// Ignore any sub-sequent refreshes made by the query
		if (!!fileTreeData) { 
			return;
		}

		if (directoryDiffDetails.data && !directoryDiffDetails.isLoading)  { 
			setFileTreeData(directoryDiffDetails.data)
		}
	}, [directoryDiffDetails.data, fileTreeData])

	if (directoryDiffDetails.isLoading || !directoryDiffDetails.data || directoryDiffDetails.isError) {
		return  { 
			isLoading: directoryDiffDetails.isLoading, 
			isError: directoryDiffDetails.isError, 
		}
	}

	const onAddFileToRootDir = (newFile: backend.FileInfo) => {
		if (!fileTreeData) { return }

		setFileTreeData({
			...fileTreeData, 
			convertValues: fileTreeData.convertValues, // idk why even the go to TS transpiler adds this
			Files: [...fileTreeData.Files, newFile]
		})
	}

	return {
		data: fileTreeData, 
		onAddFile: onAddFileToRootDir
	}

}

function NoFileSelected() {
	return <div className="w-full h-full grid place-content-center">Select a file to view diff</div>;
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
	}, [tabKey]);

	if (!fileInfo) {
		return <div>No file was selected</div>;
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
			linkPath: `/${btoa(tabKey)}`,
		};
		props.fileTreeRef.current?.openFile(fileToOpen);
		if (keepFileOpen) {
			props.fileTreeRef.current?.setFilePermaOpen(fileToOpen);
		}
	};

	return (
		<div className="w-full h-full">
			{/* <Card className="p-2 m-5  max-h-screen overflow-auto"> */}
			<TreeNode directory={directoryData} onFileClick={onOpenFile} />
			{/* </Card> */}
		</div>
	);
}
