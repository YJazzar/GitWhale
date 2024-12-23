import FileDiffView from '@/components/file-diff-view';
import { FileTabs, FileTabsHandle } from '@/components/file-tabs';
import { TreeNode } from '@/components/tree-component';
import { useRef } from 'react';
import { useQuery } from 'react-query';
import { backend } from '../../wailsjs/runtime/';
import { GetDirectoryDiffDetails } from '../../wailsjs/go/backend/App';
import { ScrollArea } from '@/components/ui/scroll-area';

const getFileKey = (file: backend.FileInfo) => {
	return `${file.Path}/${file.Name}`;
};

export default function DirDiffPage() {
	const directoryDiffDetails = useQuery({
		queryKey: ['GetDirectoryDiffDetails'],
		queryFn: GetDirectoryDiffDetails,
	});

	const fileTabRef = useRef<FileTabsHandle>(null);

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
				<ScrollArea className="h-screen w-screen-sm">
					{/* <div className=" border h-screen overflow-y-auto"> */}
					<FileTree fileTreeRef={fileTabRef} />
					{/* </div> */}
				</ScrollArea>

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
			</div>
		</>
	);
}

function FileTree(props: { fileTreeRef: React.RefObject<FileTabsHandle> }) {
	const directoryDiffDetails = useQuery({
		queryKey: ['GetDirectoryDiffDetails'],
		queryFn: GetDirectoryDiffDetails,
	});

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

	const onOpenFile = (file: backend.FileInfo) => {
		props.fileTreeRef.current?.openFile({
			tabKey: getFileKey(file),
			render: function (): JSX.Element {
				return <FileDiffView file={file} />;
			},
			title: file.Name,
		});
	};

	return (
		<div className="w-full h-full">
			{/* <Card className="p-2 m-5  max-h-screen overflow-auto"> */}
			<TreeNode directory={directoryDiffDetails.data} onFileClick={onOpenFile} />
			{/* </Card> */}
		</div>
	);
}
