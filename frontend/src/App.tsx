import { useState } from 'react';

import { QueryClient, QueryClientProvider } from 'react-query';
import { createBrowserRouter, RouterProvider } from 'react-router';
import './App.css';
import AppLayout from './AppLayout';
import { ModeToggle } from './components/mode-toggle';
import { ThemeProvider } from './components/theme-provider';
import { PageRoutes } from './PageRoutes';

// Create a client
const queryClient = new QueryClient();

function App() {
	return (
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<QueryClientProvider client={queryClient}>
				<div id="App">
					<RouterProvider router={router} />
					<ModeToggle />
				</div>
			</QueryClientProvider>
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
