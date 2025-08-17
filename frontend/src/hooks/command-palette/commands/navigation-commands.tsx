import { useNavigateRootFilTabs } from '@/hooks/navigation/use-navigate-root-file-tabs';
import { CommandDefinition, CommandPaletteContextKey } from '@/types/command-palette';
import { FileText, FolderOpen, Home, Settings } from 'lucide-react';
import { useEffect } from 'react';

import { UseAppState } from '@/hooks/state/use-app-state';
import { useCommandRegistry } from '../use-command-registry';

// Navigate to Home
const navigateHome: CommandDefinition<ReturnType<typeof useNavigateRootFilTabs>> = {
	id: 'navigate.home',
	title: 'Go to: Home',
	icon: <Home className="h-4 w-4" />,
	keywords: ['home', 'navigate', 'main'],
	context: CommandPaletteContextKey.Root,
	action: {
		requestedHooks: () => {
			return useNavigateRootFilTabs();
		},
		runAction: async (providedHooks, parameters) => {
			providedHooks.onOpenHomePage();
		},
	},
};

// Navigate to Settings
const navigateSettings: CommandDefinition<ReturnType<typeof useNavigateRootFilTabs>> = {
	id: 'navigate.settings',
	title: 'Go to: Settings',
	icon: <Settings className="h-4 w-4" />,
	keywords: ['settings', 'preferences', 'config'],
	context: CommandPaletteContextKey.Root,
	action: {
		requestedHooks: () => {
			return useNavigateRootFilTabs();
		},
		runAction: async (providedHooks, parameters) => {
			providedHooks.onOpenSettings();
		},
	},
};

// Navigate to Application Logs
const navigateApplicationLogs: CommandDefinition<ReturnType<typeof useNavigateRootFilTabs>> = {
	id: 'navigate.logs',
	title: 'Go to: Application Logs',
	icon: <FileText className="h-4 w-4" />,
	keywords: ['logs', 'debug', 'application'],
	context: CommandPaletteContextKey.Root,
	action: {
		requestedHooks: () => {
			return useNavigateRootFilTabs();
		},
		runAction: async (providedHooks, parameters) => {
			providedHooks.onOpenApplicationLogs();
		},
	},
};

function useOpenRepositoryHooks() {
	return {
		rootNavigation: useNavigateRootFilTabs(),
		appState: UseAppState().appState,
	};
}

// Open Repository
const openRepository: CommandDefinition<ReturnType<typeof useOpenRepositoryHooks>> = {
	id: 'navigate.open.repo',
	title: 'Open Repository',
	icon: <FolderOpen className="h-4 w-4" />,
	keywords: ['open', 'repository', 'folder', 'browse'],
	context: CommandPaletteContextKey.Root,
	parameters: [
		{
			id: 'repoPath',
			type: 'select',
			prompt: 'Repository path',
			placeholder: '/path/to/repository',
			required: true,
			allowCustomInput: true,
			options: (providedHooks, parameters) => {
				const convertStringsToOptions = (arrayOfStrings: string[] | undefined) => {
					return (arrayOfStrings ?? []).map((str) => {
						return { optionKey: str, optionValue: str };
					});
				};

				// Separate starred and non-starred repos for display
				const starredRepos = providedHooks.appState?.appConfig?.starredGitRepos ?? [];
				const recentRepos = providedHooks.appState?.appConfig?.recentGitRepos ?? [];
				const nonStarredRecentRepos = recentRepos.filter((repo) => !starredRepos.includes(repo));

				const options = [];
				if (starredRepos.length > 0) {
					options.push({
						groupKey: 'starredRepos',
						groupName: 'Starred Repos',
						options: convertStringsToOptions(starredRepos),
					});
				}

				if (nonStarredRecentRepos.length > 0) {
					options.push({
						groupKey: 'recentRepos',
						groupName: 'Recent Repos',
						options: convertStringsToOptions(nonStarredRecentRepos),
					});
				}
				
				return options;
			},
			validation: async (value, context) => {
				if (!value.trim()) return 'Repository path is required';
				// In a real implementation, you might validate the path exists
				return undefined;
			},
		},
	],
	action: {
		requestedHooks: useOpenRepositoryHooks,
		runAction: async (providedHooks, parameters) => {
			const repoPath = parameters.get('repoPath');
			providedHooks.rootNavigation.onOpenRepoWithPath(repoPath?.value ?? '');
		},
	},
};

// Register all navigation commands
export function useRegisterNavigationCommands() {
	const commandRegistry = useCommandRegistry(undefined);

	const gitCommands = [navigateHome, navigateSettings, navigateApplicationLogs, openRepository];

	useEffect(() => {
		commandRegistry.registerCommands(gitCommands);
	}, []);
}
