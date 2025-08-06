import { House } from 'lucide-react';
import { useRef, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import './App.css';
import { FileTabs, TabsManagerHandle } from './components/file-tabs';
import LoadingSpinner from './components/loading-spinner';
import { ThemeProvider } from './components/theme-provider';
import { UseIsDirDiffMode } from './hooks/use-is-dir-diff-mode';
import { Logger } from './utils/logger';

import DirDiffPage from './pages/DirDiffPage';
import RepoPage from './pages/repo/RepoPage';
import { Toaster } from './components/ui/toaster';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import ApplicationLogsPage from './pages/ApplicationLogsPage';
import RepoFileTab from './components/repo-file-tab';
import { TabProps } from './hooks/state/use-file-manager-state';

// Create a client
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
});

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
	const fileTabRef = useRef<TabsManagerHandle>(null);

	// Callback to open a new repository tab
	const handleOpenRepo = useCallback((repoPath: string) => {
		if (!repoPath || repoPath === "") { 
			return;
		}

		const fileTabsHandler = fileTabRef.current;
		if (!fileTabsHandler) {
			Logger.error('File tab handler is not initialized', 'App');
			return;
		}

		const newRepoTab: TabProps = {
			tabKey: repoPath,
			titleRender: () => <RepoFileTab repoPath={repoPath} />,
			component: <RepoPage repoPath={repoPath} />,
			isPermanentlyOpen: true,
			onTabClose: () => {},
		};

		fileTabsHandler.openTab(newRepoTab);
	}, []);

	// Callback to open settings tab
	const handleOpenSettings = useCallback(() => {
		fileTabRef.current?.openTab({
			tabKey: '$$setting$$',
			titleRender: () => <>Settings</>,
			component: <SettingsPage />,
			isPermanentlyOpen: true,
		});
	}, []);

	// Callback to open application logs tab
	const handleOpenApplicationLogs = useCallback(() => {
		fileTabRef.current?.openTab({
			tabKey: '$$logs$$',
			titleRender: () => <>Application Logs</>,
			component: <ApplicationLogsPage />,
			isPermanentlyOpen: true,
		});
	}, []);

	// Base application tabs (consistent structure)
	let defaultTab = "$$home$$"
	const initialTabs: TabProps[] = [
		{
			tabKey: '$$home$$',
			titleRender: () => <House className="box-content h-5" />,
			component: (
				<HomePage
					onOpenRepo={handleOpenRepo}
					onOpenSettings={handleOpenSettings}
					onOpenApplicationLogs={handleOpenApplicationLogs}
				/>
			),
			isPermanentlyOpen: true,
			preventUserClose: true,
		},
	];

	if (isInDirDiffMode) {
		defaultTab = "$$dirDiff$$"
		initialTabs.push({
			tabKey: '$$dirDiff$$',
			titleRender: () => <>Git Dir Diff</>,
			component: <DirDiffPage />,
			isPermanentlyOpen: true,
			preventUserClose: true,
		});
	}

	if (isInDirDiffMode === undefined) {
		return <LoadingSpinner />;
	}

	return (
		<div className=" w-full h-full flex flex-row ">
			<div className="border grow">
				<FileTabs
					ref={fileTabRef}
					initialTabs={initialTabs}
					defaultTabKey={defaultTab}
					fileTabManageSessionKey={'app-workspace'}
				/>
				<Toaster />
			</div>
		</div>
	);
}
