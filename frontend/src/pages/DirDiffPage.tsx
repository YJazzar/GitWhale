import { useQuery } from 'react-query';
import { GetDirectoryDiffDetails, GetStartupState } from '../../wailsjs/go/backend/App';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import * as monaco from 'monaco-editor';

var originalModel = monaco.editor.createModel(
	'This line is removed on the right.\njust some text\nabcd\nefgh\nSome more text',
	'text/plain'
);
var modifiedModel = monaco.editor.createModel(
	'just some text\nabcz\nzzzzefgh\nSome more text\nThis line is removed on the left.',
	'text/plain'
);

export default function DirDiffPage() {
	const startupStateQuery = useQuery({
		queryKey: ['GetStartupState'],
		queryFn: GetStartupState,
	});

	const editorDivRef = useRef<HTMLDivElement>(null);
	const [editor, setEditor] = useState<monaco.editor.IStandaloneDiffEditor | undefined>(undefined);
	// const [data, setData] = useState<SessionDataInput[]>([]);


	const testClick = () => {
		GetDirectoryDiffDetails()
	}

	useEffect(() => {
		if (editor || !editorDivRef.current) {
			return;
		}

		// Hover on each property to see its docs!
		const myEditor = monaco.editor.createDiffEditor(editorDivRef.current, {
			// Render the diff inline,
			renderSideBySide: true,
			automaticLayout: true,
			theme: 'vs-dark'
		});

		myEditor.setModel({
			original: originalModel,
			modified: modifiedModel,
		});

		setEditor(myEditor);
		console.log('CREATING AN EDITOR NOW');

		return () => {
			myEditor.dispose();
			console.log('DISPOSING ONE NOW');
		};
	}, []);

	return (
		<div className="h-full w-full">
			<Button onClick={testClick}>Test</Button>
			<div ref={editorDivRef} id="container" className="h-full w-full"></div>
			{/* <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
				<code className="text-white">{JSON.stringify(startupStateQuery, null, 2)}</code>
			</pre> */}
		</div>
	);
}
