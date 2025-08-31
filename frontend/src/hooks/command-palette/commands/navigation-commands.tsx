import { useNavigateRootFilTabs } from '@/hooks/navigation/use-navigate-root-file-tabs';
import { CommandDefinition, CommandPaletteContextKey } from '@/types/command-palette';
import { Bug, FileText, FolderOpen, Home, Settings, Terminal } from 'lucide-react';
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
		type: 'function',
		requestedHooks: () => {
			return useNavigateRootFilTabs();
		},
		runAction: async (providedHooks) => {
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
		type: 'function',
		requestedHooks: () => {
			return useNavigateRootFilTabs();
		},
		runAction: async (providedHooks) => {
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
		type: 'function',
		requestedHooks: () => {
			return useNavigateRootFilTabs();
		},
		runAction: async (providedHooks) => {
			providedHooks.onOpenApplicationLogs();
		},
	},
};

// Navigate to State Inspector
const navigateStateInspector: CommandDefinition<ReturnType<typeof useNavigateRootFilTabs>> = {
	id: 'navigate.state-inspector',
	title: 'Go to: State Inspector',
	icon: <Bug className="h-4 w-4" />,
	keywords: ['state', 'debug', 'inspector', 'atoms'],
	context: CommandPaletteContextKey.Root,
	action: {
		type: 'function',
		requestedHooks: () => {
			return useNavigateRootFilTabs();
		},
		runAction: async (providedHooks) => {
			providedHooks.onOpenStateInspector();
		},
	},
};

// Navigate to Command Logs
const navigateCommandLogs: CommandDefinition<ReturnType<typeof useNavigateRootFilTabs>> = {
	id: 'navigate.command-logs',
	title: 'Go to: Command Logs',
	icon: <Bug className="h-4 w-4" />,
	keywords: ['commands', 'logs', 'debug', 'git', 'execution'],
	context: CommandPaletteContextKey.Root,
	action: {
		type: 'function',
		requestedHooks: () => {
			return useNavigateRootFilTabs();
		},
		runAction: async (providedHooks) => {
			providedHooks.onOpenCommandLogs();
		},
	},
};

// Open a command editor
const navigateNewCommand: CommandDefinition<ReturnType<typeof useNavigateRootFilTabs>> = {
	id: 'navigate.new.userScriptCommand',
	title: 'New User Script',
	icon: <Terminal className="h-4 w-4" />,
	keywords: ['new', 'custom', 'script', 'command', 'user'],
	context: CommandPaletteContextKey.Root,
	action: {
		type: 'function',
		requestedHooks: () => {
			return useNavigateRootFilTabs();
		},
		runAction: async (providedHooks) => {
			providedHooks.onOpenUserScriptCommandEditor();
		},
	},
};

const editCommand: CommandDefinition<ReturnType<typeof useAppLevelHooks>> = {
	id: 'navigate.edit.userScriptCommand',
	title: 'Edit User Script',
	icon: <Terminal className="h-4 w-4" />,
	keywords: ['edit', 'custom', 'script', 'command', 'user'],
	context: CommandPaletteContextKey.Root,
	parameters: [
		{
			id: 'commandID',
			type: 'select',
			prompt: 'Command to edit',
			required: true,
			allowCustomInput: false,
			options: (providedHooks) => {
				return [
					{
						groupKey: 'custom commands',
						groupName: '',
						options:
							providedHooks.appState?.appConfig?.settings?.userScriptCommands?.map(
								(userScriptCommand) => {
									return {
										optionKey: userScriptCommand.id,
										optionValue: userScriptCommand.title,
									};
								}
							) ?? [],
					},
				];
			},
		},
	],
	action: {
		type: 'function',
		requestedHooks: useAppLevelHooks,
		runAction: async (providedHooks, parameters) => {
			const commandID = parameters.get('commandID');
			if (!commandID?.value || commandID.value === '') {
				throw 'No command was provided';
			}

			providedHooks.rootNavigation.onOpenUserScriptCommandEditor(commandID.value);
		},
	},
};

function useAppLevelHooks() {
	return {
		rootNavigation: useNavigateRootFilTabs(),
		appState: UseAppState().appState,
	};
}

// Open Repository
const openRepository: CommandDefinition<ReturnType<typeof useAppLevelHooks>> = {
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
			options: (providedHooks) => {
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
			validation: async (value) => {
				if (!value.trim()) return 'Repository path is required';
				// In a real implementation, you might validate the path exists
				return undefined;
			},
		},
	],
	action: {
		type: 'function',
		requestedHooks: useAppLevelHooks,
		runAction: async (providedHooks, parameters) => {
			const repoPath = parameters.get('repoPath');
			providedHooks.rootNavigation.onOpenRepoWithPath(repoPath?.value ?? '');
		},
	},
};

// Register all navigation commands
export function useRegisterNavigationCommands() {
	const commandRegistry = useCommandRegistry(undefined);

	useEffect(() => {
		const gitCommands = [
			navigateHome,
			navigateSettings,
			navigateApplicationLogs,
			navigateStateInspector,
			navigateCommandLogs,
			openRepository,
			navigateNewCommand,
			editCommand,
		];
		commandRegistry.registerCommands(gitCommands as CommandDefinition<unknown>[]);
	}, []);
}
