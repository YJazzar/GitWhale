import { House } from 'lucide-react';
import { QueryClient, QueryClientProvider } from 'react-query';
import './App.css';
import { CommandPalette } from './components/command-palette/CommandPalette';
import { FileTabs } from './components/file-tabs/file-tabs';
import LoadingSpinner from './components/loading-spinner';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/toaster';
import {
	CommandPaletteContextKey,
	useCommandPaletteState,
} from './hooks/command-palette/use-command-palette-state';
import { FileTabsSessionKeyGenerator, TabProps } from './hooks/state/useFileTabsHandlers';
import { UseIsDirDiffMode } from './hooks/use-is-dir-diff-mode';
import { useKeyboardShortcut } from './hooks/use-keyboard-shortcut';
import DirDiffPage from './pages/DirDiffPage';
import HomePage from './pages/HomePage';
import { useRegisterGitCommands } from './hooks/command-palette/commands/git-commands';
import { useRegisterNavigationCommands } from './hooks/command-palette/commands/navigation-commands';
import { useEffect } from 'react';

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

	// Command palette stuff
	const commandPaletteState = useCommandPaletteState();
	useRegisterGitCommands();
	useRegisterNavigationCommands();

	useKeyboardShortcut('p', () => {
		commandPaletteState.isActive.toggle();
	});

	useEffect(() => {
		commandPaletteState.availableContexts.addContext({
			contextKey: CommandPaletteContextKey.Root,
		});

		return () => {
			commandPaletteState.availableContexts.removeContext(CommandPaletteContextKey.Root);
		};
	}, []);

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
					fileTabManageSessionKey={FileTabsSessionKeyGenerator.appWorkspace()}
				/>
				<Toaster />
				<CommandPalette />
			</div>
		</div>
	);
}
