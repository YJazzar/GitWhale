import { DirDiffViewer } from '@/components/dir-diff-viewer';
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { backend } from '../../wailsjs/go/models';
import { EventsOff, EventsOn } from '../../wailsjs/runtime/runtime';


export default function DirDiffPage() {
	return <>hi.... this is awkward</>
	// const fileTreeData = useDiffFileTreeData();

	// const onAddNewFileToDiff = (event: backend.FileInfo) => {
	// 	fileTreeData.onAddFile?.(event);
	// };

	// // Listen for additional files we may need to diff later on:
	// useEffect(() => {
	// 	EventsOn('onOpenNewFileDiff', onAddNewFileToDiff);
	// 	return () => {
	// 		EventsOff('onOpenNewFileDiff');
	// 	};
	// }, []);

	// return (
	// 	<DirDiffViewer
	// 		directoryData={fileTreeData.data || null}
	// 		isLoading={fileTreeData.isLoading}
	// 		isError={fileTreeData.isError}
	// 		error={fileTreeData}
	// 		onAddFile={fileTreeData.onAddFile}
	// 		title="Git Directory Diff"
	// 		emptyMessage="Select a file to view diff"
	// 	/>
	// );
}

function useDiffFileTreeData() { 
	// const directoryDiffDetails = useQuery({
	// 	queryKey: ['GetDirectoryDiffDetails'],
	// 	queryFn: GetDirectoryDiffDetails,
	// });

	const [fileTreeData, setFileTreeData] = useState<backend.Directory | undefined>(undefined)
	// useEffect(() => { 
	// 	// Ignore any sub-sequent refreshes made by the query
	// 	if (!!fileTreeData) { 
	// 		return;
	// 	}

	// 	if (directoryDiffDetails.data && !directoryDiffDetails.isLoading)  { 
	// 		setFileTreeData(directoryDiffDetails.data)
	// 	}
	// }, [directoryDiffDetails.data, fileTreeData])

	// if (directoryDiffDetails.isLoading || !directoryDiffDetails.data || directoryDiffDetails.isError) {
	// 	return  { 
	// 		isLoading: directoryDiffDetails.isLoading, 
	// 		isError: directoryDiffDetails.isError, 
	// 	}
	// }

	const onAddFileToRootDir = (newFile: backend.FileInfo) => {
		// if (!fileTreeData) { return }

		// setFileTreeData({
		// 	...fileTreeData, 
		// 	convertValues: fileTreeData.convertValues, // idk why even the go to TS transpiler adds this
		// 	Files: [...fileTreeData.Files, newFile]
		// })
	}

	return {
		data: fileTreeData, 
		onAddFile: onAddFileToRootDir
	}

}

