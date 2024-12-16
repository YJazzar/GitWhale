import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import App from './App';
import { ThemeProvider } from './components/theme-provider';

const container = document.getElementById('root');

const root = createRoot(container!);

root.render(
	<React.StrictMode>
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<App />
		</ThemeProvider>
	</React.StrictMode>
);
