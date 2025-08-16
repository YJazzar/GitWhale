import { CommandDefinition, CommandNavigationDestination } from '@/types/command-palette';
import { Home, Settings, FileText, FolderOpen } from 'lucide-react';
import React, { useEffect } from 'react';
import { useCommandRegistry } from '../use-command-registry';
import { CommandPaletteContextKey } from '../use-command-palette-state';

// Navigate to Home
const navigateHome: CommandDefinition = {
	id: 'navigate.home',
	title: 'Go to Home',
	description: 'Navigate to the home page',
	icon: <Home className="h-4 w-4" />,
	keywords: ['home', 'navigate', 'main'],
	context: CommandPaletteContextKey.Root,
	action: {
		type: 'navigation',
		destination: CommandNavigationDestination.applicationHome,
		sideEffects: [],
	},
};

// Navigate to Settings
const navigateSettings: CommandDefinition = {
	id: 'navigate.settings',
	title: 'Open Settings',
	description: 'Open the application settings',
	icon: <Settings className="h-4 w-4" />,
	keywords: ['settings', 'preferences', 'config'],
	context: CommandPaletteContextKey.Root,
	action: {
		type: 'navigation',
		destination: CommandNavigationDestination.applicationSettings,
		sideEffects: [],
	},
};

// Navigate to Application Logs
const navigateApplicationLogs: CommandDefinition = {
	id: 'navigate.logs',
	title: 'View Application Logs',
	description: 'Open the application logs',
	icon: <FileText className="h-4 w-4" />,
	keywords: ['logs', 'debug', 'application'],
	context: CommandPaletteContextKey.Root,
	action: {
		type: 'navigation',
		destination: CommandNavigationDestination.applicationLogs,
		sideEffects: [],
	},
};

// Open Repository
const openRepository: CommandDefinition = {
	id: 'navigate.open.repo',
	title: 'Open Repository',
	description: 'Open a repository folder',
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
				return null;
			},
		},
	],
	action: {
		type: 'navigation',
		destination: CommandNavigationDestination.repoHome,
		sideEffects: [],
	},
};

// Register all navigation commands
export function useRegisterNavigationCommands() {
	const commandRegistry = useCommandRegistry(undefined, undefined);

	const gitCommands = [navigateHome, navigateSettings, navigateApplicationLogs, openRepository];

	useEffect(() => {
		gitCommands.forEach((command) => commandRegistry.registerCommand(command));
	}, []);
}
