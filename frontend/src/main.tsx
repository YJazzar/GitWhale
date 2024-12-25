import * as monaco from 'monaco-editor';
import React from 'react';
import { createRoot } from 'react-dom/client';
import WrappedAppProvider from './App';

const container = document.getElementById('root');

const root = createRoot(container!);

self.MonacoEnvironment = {
	getWorker: async function (workerId: never, label: string) {
		let worker;

		switch (label) {
			case 'json':
				worker = await import('monaco-editor/esm/vs/language/json/json.worker?worker');
				break;
			case 'css':
			case 'scss':
			case 'less':
				worker = await import('monaco-editor/esm/vs/language/css/css.worker?worker');
				break;
			case 'html':
			case 'handlebars':
			case 'razor':
				worker = await import('monaco-editor/esm/vs/language/html/html.worker?worker');
				break;
			case 'typescript':
			case 'javascript':
				worker = await import('monaco-editor/esm/vs/language/typescript/ts.worker?worker');
				break;
			default:
				worker = await import('monaco-editor/esm/vs/editor/editor.worker?worker');
		}

		return new worker.default();
	},
};

monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
	noSemanticValidation: true,
	noSyntaxValidation: true,
});


root.render(
	<React.StrictMode>
		<WrappedAppProvider />
	</React.StrictMode>
);
