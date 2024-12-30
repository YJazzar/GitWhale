import { House } from 'lucide-react';
import { useRef } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import './App.css';
import { FileTabs, FileTabsHandle } from './components/file-tabs';
import LoadingSpinner from './components/loading-spinner';
import { ThemeProvider } from './components/theme-provider';
import { UseIsDirDiffMode } from './hooks/use-is-dir-diff-mode';

import DirDiffPage from './pages/DirDiffPage';
import RepoLog from './pages/repo/RepoLogView';
import RepoPage, { RepoHomeView } from './pages/repo/RepoPage';
import { Toaster } from './components/ui/toaster';
import HomePage from './pages/HomePage';

// Create a client
const queryClient = new QueryClient();

export default function WrappedAppProvider() {
	return (
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<QueryClientProvider client={queryClient}>
				<BrowserRouter>
					<div id="App" className="h-screen w-screen">
						<App />
					</div>
				</BrowserRouter>
			</QueryClientProvider>
		</ThemeProvider>
	);
}

function App() {
	const isInDirDiffMode = UseIsDirDiffMode();

	const fileTabRef = useRef<FileTabsHandle>(null);

	if (isInDirDiffMode === undefined) {
		console.log('returning spinner');
		return <LoadingSpinner />;
	}

	if (isInDirDiffMode) {
		return <DirDiffPage />;
	}

	return (
		<div className=" w-full h-full flex flex-row ">
			<div className="border grow">
				<FileTabs
					ref={fileTabRef}
					defaultTabKey="home"
					initialPages={[
						{
							tabKey: 'home',
							titleRender: () => <House className="box-content h-5" />,
							isPermanentlyOpen: true,
							preventUserClose: true,
							linkPath: '/home',
						},
					]}
					noTabSelectedPath="/DirDiffHome"
					routerConfig={() => {
						return (
							<Routes>
								<Route path="/" element={<Navigate to="/home" replace />} />
								<Route path="/home" element={<HomePage fileTabRef={fileTabRef} />} />
								<Route path="/repo" element={<RepoPage />}>
									{/* <Route path=":log" element={<RepoLog />} /> */}
									{/* <Route path="/repo/:encodedRepoPath" element={<Navigate to="/repo/:encodedRepoPath/log" />} /> */}
									<Route path="/repo/:encodedRepoPath">
										<Route
											index={true}
											element={<Navigate to="home"  replace/>}
										/>
										<Route path="home" element={<RepoHomeView />} />
										<Route path="log" element={<RepoLog />} />
									</Route>
								</Route>
							</Routes>
						);
					}}
				/>

				<Toaster />
			</div>
		</div>
	);
}
