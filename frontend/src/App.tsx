import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter, createBrowserRouter, Route, RouterProvider, Routes } from 'react-router';
import './App.css';
import AppLayout from './AppLayout';
import { ModeToggle } from './components/mode-toggle';
import { ThemeProvider } from './components/theme-provider';
import { PageRoutes } from './PageRoutes';
import { UseIsDirDiffMode } from './hooks/use-is-dir-diff-mode';
import LoadingSpinner from './components/loading-spinner';
import DirDiffPage from './pages/DirDiffPage';
import HomePage from './pages/HomePage';
import RepoPage from './pages/repo/RepoPage';
import RepoLog from './pages/repo/RepoLog';

// Create a client
const queryClient = new QueryClient();

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

export default function WrappedAppProvider() {
	return (
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<QueryClientProvider client={queryClient}>
				<div id="App" className="h-screen w-screen">
					<App />
				</div>
			</QueryClientProvider>
		</ThemeProvider>
	);
}

function App() {
	const isInDirDiffMode = UseIsDirDiffMode();

	if (isInDirDiffMode === undefined) {
		console.log('returning spinner');
		return <LoadingSpinner />;
	}

	if (isInDirDiffMode) {
		return <DirDiffPage />;
	}

	return (
		<BrowserRouter>
			<div className="border-red-200 border ">
				<Routes>
					<Route path="/" element={<HomePage />} />
					<Route path="/:repoIndex" element={<RepoPage />}>
						<Route path=":log" element={<RepoLog />} />
					</Route>
				</Routes>
			</div>
		</BrowserRouter>
	);
}
