import FileDiffView from '@/components/file-diff-view';
import { FileTabPageProps, FileTabs, FileTabsHandle } from '@/components/file-tabs';
import { TreeNode } from '@/components/tree-component';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { GetDirectoryDiffDetails } from '../../wailsjs/go/backend/App';
import { backend } from '../../wailsjs/go/models';

const getFileKey = (file: backend.FileInfo) => {
	return `${file.Path}/${file.Name}`;
};

export default function DirDiffPage() {
	const directoryDiffDetails = useQuery({
		queryKey: ['GetDirectoryDiffDetails'],
		queryFn: GetDirectoryDiffDetails,
	});

	const fileTabRef = useRef<FileTabsHandle>(null);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === 'w') {
				let currentFile = fileTabRef.current?.getOpenFile();
				if (currentFile) {
					fileTabRef.current?.closeFile(currentFile);
				}
			}
		};

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, []);

	if (directoryDiffDetails.isLoading || !directoryDiffDetails.data) {
		return <>Loading....</>;
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

	return (
		<>
			<div className="w-full h-full flex flex-row ">
				<ResizablePanelGroup direction="horizontal" >
					{/* Left pane that contains the file structure */}
					<ResizablePanel defaultSize={20} >
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
								defaultTabKey="fileTree"
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
							/>
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</div>
		</>
	);
}

function FileTree(props: { fileTreeRef: React.RefObject<FileTabsHandle>; directoryData: backend.Directory }) {
	const { directoryData } = props;

	const onOpenFile = (file: backend.FileInfo, keepFileOpen: boolean) => {
		let fileToOpen: FileTabPageProps = {
			tabKey: getFileKey(file),
			render: function (): JSX.Element {
				return <FileDiffView file={file} />;
			},
			title: file.Name,
			isPermanentlyOpen: keepFileOpen,
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
