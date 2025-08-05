import { House } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import './App.css';
import { FileTabs, TabsManagerHandle } from './components/file-tabs';
import LoadingSpinner from './components/loading-spinner';
import { ThemeProvider } from './components/theme-provider';
import { ZoomControls } from './components/zoom-controls';
import { UseIsDirDiffMode } from './hooks/use-is-dir-diff-mode';
import { Logger } from './utils/logger';

import RepoFileTab from './components/repo-file-tab';
import { Toaster } from './components/ui/toaster';
import { TabProps } from './hooks/state/use-file-manager-state';
import ApplicationLogsPage from './pages/ApplicationLogsPage';
import DirDiffPage from './pages/DirDiffPage';
import HomePage from './pages/HomePage';
import RepoPage from './pages/repo/RepoPage';
import SettingsPage from './pages/SettingsPage';

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

	// State to track if settings tab should be shown
	const [showSettingsTab, setShowSettingsTab] = useState(false);

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
	const initialTabs: TabProps[] = [
		{
			tabKey: '$$home$$',
			titleRender: () => <House className="box-content h-5" />,
			component: <HomePage onOpenRepo={handleOpenRepo} onOpenSettings={handleOpenSettings} onOpenApplicationLogs={handleOpenApplicationLogs} />,
			isPermanentlyOpen: true,
			preventUserClose: true,
		},
	];


	if (isInDirDiffMode === undefined) {
		return <LoadingSpinner />;
	}

	if (isInDirDiffMode) {
		return <DirDiffPage />;
	}

	return (
		<div className="w-full h-full flex flex-row relative">
			<div className="border grow">
				<FileTabs
					ref={fileTabRef}
					initialTabs={initialTabs}
					defaultTabKey="$$home$$"
					fileTabManageSessionKey={'app-workspace'}
				/>
				<Toaster />
			</div>
			
			{/* Fixed zoom controls in bottom-right corner */}
			<div className="fixed bottom-4 right-4 z-50">
					<div className="bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
						<ZoomControls variant="compact" showLabel={false} />
					</div>
				</div>
		</div>
	);
}
