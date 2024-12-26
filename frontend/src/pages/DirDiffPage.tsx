import FileDiffView from '@/components/file-diff-view';
import { FileTabPageProps, FileTabs, FileTabsHandle } from '@/components/file-tabs';
import LoadingSpinner from '@/components/loading-spinner';
import { TreeNode } from '@/components/tree-component';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from 'react-query';
import { GetDirectoryDiffDetails } from '../../wailsjs/go/backend/App';
import { backend } from '../../wailsjs/go/models';
import { Navigate, Route, Routes, useParams } from 'react-router';

const getFileKey = (file: backend.FileInfo) => {
	return `${file.Path}/${file.Name}`;
};

export default function DirDiffPage() {
	const directoryDiffDetails = useQuery({
		queryKey: ['GetDirectoryDiffDetails'],
		queryFn: GetDirectoryDiffDetails,
	});

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

		if (directoryDiffDetails.data) {
			recurseDir(directoryDiffDetails.data);
		}

		return map;
	}, [directoryDiffDetails.data]);

	if (directoryDiffDetails.isLoading || !directoryDiffDetails.data) {
		return <LoadingSpinner />;
	}

	if (directoryDiffDetails.isError) {
		return (
			<>
				Error....{' '}
				<pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
					<code className="text-white">{JSON.stringify(directoryDiffDetails, null, 2)}</code>
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
							<FileTree fileTreeRef={fileTabRef} directoryData={directoryDiffDetails.data} />
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
											<Route path="/DirDiffHome" element={<NoFileSelected/>}/>
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

function NoFileSelected() { 
	return <div className='w-full h-full grid place-content-center'>
		Select a file to view diff
	</div>
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
