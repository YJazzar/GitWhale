import { useState } from 'react';

import './App.css';
import { Greet } from '../wailsjs/go/main/App';
import { Button } from './components/ui/button';
import { ModeToggle } from './components/mode-toggle';
import { QueryClient } from 'react-query';
import { BrowserRouter, createBrowserRouter, RouterProvider } from 'react-router';
import { ThemeProvider } from './components/theme-provider';
import AppLayout from './AppLayout';
import { PageRoutes } from './PageRoutes';

// Create a client
const queryClient = new QueryClient();

function App() {
	const [resultText, setResultText] = useState('Please enter your name below 👇');
	const [name, setName] = useState('');
	const updateName = (e: any) => setName(e.target.value);
	const updateResultText = (result: string) => setResultText(result);

	function greet() {
		Greet(name).then(updateResultText);
	}

	return (
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<div id="App">
				<RouterProvider router={router} />
				<ModeToggle />
				<Button onClick={greet}>Click me</Button>
			</div>
		</ThemeProvider>
	);
}

const router = createBrowserRouter([
	{
		path: '/',
		element: <AppLayout />,
		//   errorElement: <ErrorPage />,
		children: PageRoutes.map((route) => {
			return {
				path: route.url,
				element: route.routeElement,
			};
		}),
	},
]);

export default App;
