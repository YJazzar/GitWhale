import { House } from 'lucide-react';
import { useRef, useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import './App.css';
import { FileTabs, FileTabsHandle, FileTabPageProps } from './components/file-tabs';
import LoadingSpinner from './components/loading-spinner';
import { ThemeProvider } from './components/theme-provider';
import { UseIsDirDiffMode } from './hooks/use-is-dir-diff-mode';

import DirDiffPage from './pages/DirDiffPage';
import RepoPage from './pages/repo/RepoPage';
import { Toaster } from './components/ui/toaster';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import RepoFileTab from './components/repo-file-tab';

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
	const fileTabRef = useRef<FileTabsHandle>(null);
	const [activeTabKey, setActiveTabKey] = useState('home');
	const [repoTabs, setRepoTabs] = useState<FileTabPageProps[]>([]);

	if (isInDirDiffMode === undefined) {
		return <LoadingSpinner />;
	}

	if (isInDirDiffMode) {
		return <DirDiffPage />;
	}

	// Callback to open a new repository tab
	const handleOpenRepo = useCallback((repoPath: string) => {
		const existingTab = repoTabs.find(tab => tab.tabKey === repoPath);
		if (existingTab) {
			setActiveTabKey(repoPath);
			return;
		}

		const newRepoTab: FileTabPageProps = {
			tabKey: repoPath,
			titleRender: () => <RepoFileTab repoPath={repoPath} />,
			component: RepoPage,
			componentProps: { repoPath },
			isPermanentlyOpen: true,
			onTabClose: () => {
				setRepoTabs(prev => prev.filter(tab => tab.tabKey !== repoPath));
			}
		};

		setRepoTabs(prev => [...prev, newRepoTab]);
		setActiveTabKey(repoPath);
	}, [repoTabs]);

	// State to track if settings tab should be shown
	const [showSettingsTab, setShowSettingsTab] = useState(false);

	// Callback to open settings tab
	const handleOpenSettings = useCallback(() => {
		setShowSettingsTab(true);
		setActiveTabKey('settings');
	}, []);

	// Base application tabs (consistent structure)
	const baseApplicationTabs: FileTabPageProps[] = [
		{
			tabKey: 'home',
			titleRender: () => <House className="box-content h-5" />,
			component: HomePage,
			componentProps: { onOpenRepo: handleOpenRepo, onOpenSettings: handleOpenSettings },
			isPermanentlyOpen: true,
			preventUserClose: true,
		},
		// Settings tab - always in the array but conditionally filtered
		{
			tabKey: 'settings',
			titleRender: () => <>Settings</>,
			component: SettingsPage,
			componentProps: {},
			isPermanentlyOpen: true,
		}
	];

	// Filter tabs based on whether settings should be shown
	const visibleBaseTabs = showSettingsTab 
		? baseApplicationTabs 
		: baseApplicationTabs.filter(tab => tab.tabKey !== 'settings');

	const allTabs = [...visibleBaseTabs, ...repoTabs];

	return (
		<div className=" w-full h-full flex flex-row ">
			<div className="border grow">
				<FileTabs
					ref={fileTabRef}
					tabs={allTabs}
					activeTabKey={activeTabKey}
					onTabChange={setActiveTabKey}
					defaultTabKey="home"
				/>

				<Toaster />
			</div>
		</div>
	);
}
