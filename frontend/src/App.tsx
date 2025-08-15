import { House } from 'lucide-react';
import { QueryClient, QueryClientProvider } from 'react-query';
import './App.css';
import { FileTabs } from './components/file-tabs/file-tabs';
import LoadingSpinner from './components/loading-spinner';
import { ThemeProvider } from './components/theme-provider';
import { UseIsDirDiffMode } from './hooks/use-is-dir-diff-mode';

import { Toaster } from './components/ui/toaster';
import { TabProps } from './hooks/state/useFileTabsHandlers';
import DirDiffPage from './pages/DirDiffPage';
import HomePage from './pages/HomePage';

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

	// Base application tabs (consistent structure)
	let defaultTab = '$$home$$';
	const initialTabs: TabProps[] = [
		{
			tabKey: '$$home$$',
			titleRender: () => <House className="box-content h-5" />,
			component: <HomePage />,
			isPermanentlyOpen: true,
			preventUserClose: true,
		},
	];

	if (isInDirDiffMode) {
		defaultTab = '$$dirDiff$$';
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
					initialTabs={initialTabs}
					defaultTabKey={defaultTab}
					fileTabManageSessionKey={'app-workspace'}
				/>
				<Toaster />
			</div>
		</div>
	);
}
