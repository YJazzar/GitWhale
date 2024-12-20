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
import { FileTabs, FileTabsHandle } from '@/components/file-tabs';

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
		<div className="w-full h-full ">
			<FileTabs
				ref={fileTabRef}
				defaultTabKey="fileTree"
				initialPages={[
					{
						key: 'fileTree',
						render: () => {
							return <FileTree fileTreeRef={fileTabRef} />;
						},
						title: 'Files',
						preventUserClose: true
					},
				]}
			/>
		</div>
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
		props.fileTreeRef.current?.openNewPage({
			key: getFileKey(file),
			render: function (): JSX.Element {
				return <FileDiffView file={file} />;
			},
			title: file.Name,
		});
	};

	return (
		<div className="w-full h-full ">
			<Card className="p-2 m-5  max-h-screen overflow-auto">
				<TreeNode directory={directoryDiffDetails.data} onFileClick={onOpenFile} />
			</Card>
		</div>
	);
}
