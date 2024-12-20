import { useQuery } from 'react-query';
import { GetDirectoryDiffDetails, GetStartupState } from '../../wailsjs/go/backend/App';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import * as monaco from 'monaco-editor';
import { TreeNode } from '@/components/tree-component';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { backend } from 'wailsjs/go/models';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FileDiffView from '@/components/file-diff-view';

export default function DirDiffPage() {
	const directoryDiffDetails = useQuery({
		queryKey: ['GetDirectoryDiffDetails'],
		queryFn: GetDirectoryDiffDetails,
	});

	const [openFiles, setOpenFiles] = useState<backend.FileInfo[]>([]);

	const onFileClick = (file: backend.FileInfo) => {
		setOpenFiles([...openFiles, file]);
	};

	const getFileKey = (file: backend.FileInfo) => {
		return `${file.Path}/${file.Name}`;
	};

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
		<div className="w-full h-full ">
			

			<Tabs defaultValue="fileOptions" className=" h-full w-full">
				<TabsList>
					<TabsTrigger value="fileOptions">Files</TabsTrigger>
					{openFiles.map((file) => {
						return <TabsTrigger value={getFileKey(file)}>{file.Name}</TabsTrigger>;
					})}
				</TabsList>

				<TabsContent value="fileOptions">
					<FileTree onFileClick={onFileClick} />
				</TabsContent>
				{openFiles.map((file) => {
					return (
						<TabsContent className=' h-full w-full' value={getFileKey(file)}>
							<FileDiffView file={file} />
						</TabsContent>
					);
				})}
			</Tabs>
		</div>
	);
}

function FileTree(props: { onFileClick: (selectedFile: backend.FileInfo) => void }) {
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

	return (
		<div className="w-full h-full ">
			<Card className="p-2 m-5  max-h-screen overflow-auto">
				<TreeNode directory={directoryDiffDetails.data} onFileClick={props.onFileClick} />
			</Card>
		</div>
	);
}
