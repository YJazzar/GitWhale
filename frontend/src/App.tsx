import { House } from 'lucide-react';
import { useRef, useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import './App.css';
import { FileTabs, TabsManagerHandle } from './components/file-tabs';
import LoadingSpinner from './components/loading-spinner';
import { ThemeProvider } from './components/theme-provider';
import { UseIsDirDiffMode } from './hooks/use-is-dir-diff-mode';

import DirDiffPage from './pages/DirDiffPage';
import RepoPage from './pages/repo/RepoPage';
import { Toaster } from './components/ui/toaster';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
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
		const fileTabsHandler = fileTabRef.current;
		if (!fileTabsHandler) {
			console.error('File tab handler is not initialized');
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

	// Base application tabs (consistent structure)
	const initialTabs: TabProps[] = [
		{
			tabKey: '$$home$$',
			titleRender: () => <House className="box-content h-5" />,
			component: <HomePage onOpenRepo={handleOpenRepo} onOpenSettings={handleOpenSettings} />,
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
		<div className=" w-full h-full flex flex-row ">
			<div className="border grow">
				<FileTabs
					ref={fileTabRef}
					initialTabs={initialTabs}
					defaultTabKey="$$home$$"
					fileTabManageSessionKey={'app-workspace'}
				/>
				<Toaster />
			</div>
		</div>
	);
}
