import { UserDefinedCommandDefinition } from '@/hooks/command-palette/use-user-script-command';
import { Label } from '../ui/label';
import * as monaco from 'monaco-editor';
import { useEffect, useRef, useState } from 'react';

interface UserScriptEditorScriptInputProps {
	formData: Partial<UserDefinedCommandDefinition>;
	errors: Record<string, string>;
	updateFormField: <T extends UserDefinedCommandDefinition, K extends keyof T>(key: K, value: T[K]) => void;
}

export function UserScriptEditorScriptInput({
	formData,
	errors,
	updateFormField,
}: UserScriptEditorScriptInputProps) {
	const editorRef = useRef<HTMLDivElement>(null);
	const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
	const [isEditorReady, setIsEditorReady] = useState(false);

	// Initialize Monaco Editor
	useEffect(() => {
		if (!editorRef.current || isEditorReady) return;

		const editor = monaco.editor.create(editorRef.current, {
			value: formData.action?.commandString || '',
			language: 'shell',
			theme: 'vs-dark',
			minimap: { enabled: false },
			scrollBeyondLastLine: false,
			fontSize: 13,
			lineNumbers: 'on',
			wordWrap: 'off',
			automaticLayout: true,
			folding: true,
			glyphMargin: false,
			lineNumbersMinChars: 3,
			scrollbar: {
				vertical: 'auto',
				horizontal: 'auto',
				verticalScrollbarSize: 8,
				horizontalScrollbarSize: 8,
			},
		});

		monacoEditorRef.current = editor;
		setIsEditorReady(true);

		// Listen for content changes
		editor.onDidChangeModelContent(() => {
			const newValue = editor.getValue();
			updateFormField('action', { commandString: newValue });
		});

		return () => {
			editor.dispose();
			monacoEditorRef.current = null;
			setIsEditorReady(false);
		};
	}, []);

	// Update editor content when formData changes externally
	useEffect(() => {
		if (monacoEditorRef.current && isEditorReady) {
			const currentValue = monacoEditorRef.current.getValue();
			const newValue = formData.action?.commandString || '';
			
			if (currentValue !== newValue) {
				monacoEditorRef.current.setValue(newValue);
			}
		}
	}, [formData.action?.commandString, isEditorReady]);

	return (
		<div>
			<Label htmlFor="commandString">Shell script *</Label>
			<div 
				className={`mt-2 border rounded-md overflow-hidden ${errors['action.commandString'] ? 'border-destructive' : 'border-input'}`}
				style={{ height: '150px' }}
			>
				<div ref={editorRef} className="w-full h-full" />
			</div>
			{errors['action.commandString'] && (
				<div className="text-sm text-destructive mt-1">{errors['action.commandString']}</div>
			)}
			<div className="text-sm text-muted-foreground mt-1">
				Use {`{{parameterID}}`} to reference parameters. Supports shell/bash syntax highlighting.
			</div>
		</div>
	);
}
