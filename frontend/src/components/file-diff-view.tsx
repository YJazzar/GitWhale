import { FileExtensionToLanguage } from '@/lib/monaco-utils';
import * as monaco from 'monaco-editor';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { ReadFile } from '../../wailsjs/go/backend/App';
import { git_operations } from '../../wailsjs/go/models';

export type FileDiffViewProps = {
	file: git_operations.FileInfo;
};

type MonacoDiffModels = {
	file: git_operations.FileInfo;
	originalModel: monaco.editor.ITextModel;
	modifiedModel: monaco.editor.ITextModel;
};

function useMonacoDiffModel(file: git_operations.FileInfo) {
	const [monacoModel, setMonacoModel] = useState<MonacoDiffModels | undefined>(undefined);

	useQuery({
		queryKey: ['GetFileContentsForDiff', file],
		queryFn: async () => {
			const [originalFilePromise, modifiedFilePromise] = await Promise.allSettled([
				ReadFile(file.LeftDirAbsPath),
				ReadFile(file.RightDirAbsPath),
			]);

			const fileData = {
				fileExtension: file.Extension,
				originalFilePath: file.LeftDirAbsPath,
				originalFile: '',
				modifiedFilePath: file.RightDirAbsPath,
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

			const language = FileExtensionToLanguage[data.fileExtension] || data.fileExtension;

			setMonacoModel({
				file: file,

				modifiedModel: monaco.editor.createModel(
					data.modifiedFile,
					language
					// monaco.Uri.file(data.originalFilePath)
				),

				originalModel: monaco.editor.createModel(
					data.originalFile,
					language
					// monaco.Uri.file(data.modifiedFilePath)
				),
			});
		},
	});

	return monacoModel;
}

export default function FileDiffView(props: FileDiffViewProps) {
	const { file } = props;

	const editorDivRef = useRef<HTMLDivElement>(null);
	const [editor, setEditor] = useState<monaco.editor.IStandaloneDiffEditor | undefined>(undefined);
	const [isVisible, setIsVisible] = useState(false);

	const monacoModel = useMonacoDiffModel(file);

	// Function to trigger editor layout when component becomes visible
	const triggerLayout = useCallback(() => {
		if (editor) {
			// Small delay to ensure DOM is ready
			setTimeout(() => {
				editor.layout();
			}, 10);
		}
	}, [editor]);

	// Intersection Observer to detect when component becomes visible
	useEffect(() => {
		if (!editorDivRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (entry.isIntersecting !== isVisible) {
					setIsVisible(entry.isIntersecting);
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(editorDivRef.current);

		return () => {
			observer.disconnect();
		};
	}, [isVisible]);

	// Trigger layout when component becomes visible
	useEffect(() => {
		if (isVisible) {
			triggerLayout();
		}
	}, [isVisible, triggerLayout]);

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
			readOnly: true,
		});

		setEditor(myEditor);

		return () => {
			myEditor.dispose();
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

		// Trigger layout after setting models to ensure proper rendering
		triggerLayout();
	}, [editor, monacoModel, triggerLayout]);

	return (
		<div className="h-full w-full">
			<div ref={editorDivRef} id="container" className="h-full w-full"></div>
		</div>
	);
}
