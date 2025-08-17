import { useNavigateRootFilTabs } from '@/hooks/navigation/use-navigate-root-file-tabs';
import { CommandDefinition, CommandPaletteContextKey } from '@/types/command-palette';
import { FileText, FolderOpen, Home, Settings } from 'lucide-react';
import { useEffect } from 'react';

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

// Open Repository
const openRepository: CommandDefinition<ReturnType<typeof useNavigateRootFilTabs>> = {
	id: 'navigate.open.repo',
	title: 'Open Repository',
	icon: <FolderOpen className="h-4 w-4" />,
	keywords: ['open', 'repository', 'folder', 'browse'],
	context: CommandPaletteContextKey.Root,
	parameters: [
		{
			id: 'repoPath',
			type: 'path',
			prompt: 'Repository path',
			placeholder: '/path/to/repository',
			description: 'Enter the path to the repository',
			required: true,
			validation: (value, context) => {
				if (!value.trim()) return 'Repository path is required';
				// In a real implementation, you might validate the path exists
				return undefined;
			},
		},
	],
	action: {
		requestedHooks: () => {
			return useNavigateRootFilTabs();
		},
		runAction: async (providedHooks, parameters) => {
			const repoPath = parameters.get('repoPath')
			providedHooks.onOpenRepoWithPath(repoPath?.value ?? '');
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
