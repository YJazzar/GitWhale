import * as monaco from 'monaco-editor';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { ReadFile } from '../../wailsjs/go/backend/App';
import { backend } from '../../wailsjs/go/models';

export type FileDiffViewProps = {
	file: backend.FileInfo;
};

type MonacoDiffModels = {
	file: backend.FileInfo;
	originalModel: monaco.editor.ITextModel;
	modifiedModel: monaco.editor.ITextModel;
};

function useMonacoDiffModel(file: backend.FileInfo) {
	const [monacoModel, setMonacoModel] = useState<MonacoDiffModels | undefined>(undefined);

	const directoryDiffDetails = useQuery({
		queryKey: ['GetFileContentsForDiff', file],
		queryFn: async () => {
			// const originalFilePromise = ReadFile(file.LeftDirAbsPath);
			// const modifiedFilePromise = ReadFile(file.RightDirAbsPath);

			const [originalFilePromise, modifiedFilePromise] = await Promise.allSettled([
				ReadFile(file.LeftDirAbsPath),
				ReadFile(file.RightDirAbsPath),
			]);
			const fileData = {
				originalFile: '',
				modifiedFile: '',
			};

			if (originalFilePromise.status === 'fulfilled') {
				fileData.originalFile = originalFilePromise.value;
			} else {
				fileData.originalFile = `Failed to read file: ${file.LeftDirAbsPath}\nFail reason: ${originalFilePromise.reason}`;
			}

			if (modifiedFilePromise.status === 'fulfilled') {
				fileData.modifiedFile = modifiedFilePromise.value;
			} else {
				fileData.modifiedFile = `Failed to read file: ${file.RightDirAbsPath}\nFail reason: ${modifiedFilePromise.reason}`;
			}

			return fileData;
		},
		onSuccess(data) {
			if (!data) {
				setMonacoModel(undefined);
				return;
			}

			setMonacoModel({
				file: file,
				modifiedModel: monaco.editor.createModel(data.modifiedFile),
				originalModel: monaco.editor.createModel(data.originalFile),
			});
		},
	});

	return monacoModel;
}

export default function FileDiffView(props: FileDiffViewProps) {
	const { file } = props;

	const editorDivRef = useRef<HTMLDivElement>(null);
	const [editor, setEditor] = useState<monaco.editor.IStandaloneDiffEditor | undefined>(undefined);

	const monacoModel = useMonacoDiffModel(file);

	useEffect(() => {
		if (editor || !editorDivRef.current) {
			return;
		}

		// Hover on each property to see its docs!
		const myEditor = monaco.editor.createDiffEditor(editorDivRef.current, {
			// Render the diff inline,
			renderSideBySide: true,
			automaticLayout: true,
			theme: 'vs-dark',
		});

		setEditor(myEditor);
		console.log('CREATING AN EDITOR NOW');

		return () => {
			myEditor.dispose();
			console.log('DISPOSING ONE NOW');
		};
	}, []);

	useEffect(() => {
		if (!editor || !monacoModel) {
			return;
		}

		editor.setModel({
			original: monacoModel.originalModel,
			modified: monacoModel.modifiedModel,
		});
	}, [editor, monacoModel]);

	return (
		<div className="h-full w-full">
			<div ref={editorDivRef} id="container" className="h-full w-full"></div>
		</div>
	);
}
