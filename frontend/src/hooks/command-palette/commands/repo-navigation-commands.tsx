import {
	CommandDefinition,
	CommandPaletteContextData,
	CommandPaletteContextKey,
	RepoCommandPaletteContextData,
} from '@/types/command-palette';
import { FolderGit } from 'lucide-react';
import { useEffect } from 'react';
import { SidebarSessionKeyGenerator, useSidebarHandlers } from '@/hooks/state/useSidebarHandlers';
import { useCommandRegistry } from '../use-command-registry';

function repoNavigationRequestedHooks(contextData: CommandPaletteContextData | undefined) {
	if (!contextData || contextData.contextKey !== CommandPaletteContextKey.Repo) {
		return;
	}

	const repoContextData = contextData as RepoCommandPaletteContextData;
	const repoPath = repoContextData.repoPath;
	const repoSideBar = useSidebarHandlers(SidebarSessionKeyGenerator.repoSidebar(repoPath));

	return {
		repoPath: repoContextData.repoPath,
		repoSideBar,
	};
}

type CommandDefinitionWithRepoState = CommandDefinition<
	ReturnType<typeof repoNavigationRequestedHooks> | undefined
>;

// Navigate to Repo Home
const navigateRepoHome: CommandDefinitionWithRepoState = {
	id: 'repo.navigate.home',
	title: 'Go to: Repo Home',
	icon: <FolderGit className="h-4 w-4" />,
	keywords: ['repo', 'home', 'navigate'],
	context: CommandPaletteContextKey.Repo,
	action: {
		type: 'function',
		requestedHooks: repoNavigationRequestedHooks,
		runAction: async (providedHooks, parameters) => {
			providedHooks?.repoSideBar.setActiveItem('home');
		},
	},
};

// Navigate to Repo Home
const navigateRepoStagingArea: CommandDefinitionWithRepoState = {
	id: 'repo.navigate.staging',
	title: 'Go to: Repo Staging Area',
	icon: <FolderGit className="h-4 w-4" />,
	keywords: ['repo', 'staging', 'area', 'navigate'],
	context: CommandPaletteContextKey.Repo,
	action: {
		type: 'function',
		requestedHooks: repoNavigationRequestedHooks,
		runAction: async (providedHooks, parameters) => {
			providedHooks?.repoSideBar.setActiveItem('staging');
		},
	},
};

// Navigate to Repo Home
const navigateRepoLog: CommandDefinitionWithRepoState = {
	id: 'repo.navigate.log',
	title: 'Go to: Repo Log',
	icon: <FolderGit className="h-4 w-4" />,
	keywords: ['repo', 'log', 'navigate'],
	context: CommandPaletteContextKey.Repo,
	action: {
		type: 'function',
		requestedHooks: repoNavigationRequestedHooks,
		runAction: async (providedHooks, parameters) => {
			providedHooks?.repoSideBar.setActiveItem('log');
		},
	},
};

// Navigate to Repo Home
const navigateRepoTerminal: CommandDefinitionWithRepoState = {
	id: 'repo.navigate.terminal',
	title: 'Go to: Repo Terminal',
	icon: <FolderGit className="h-4 w-4" />,
	keywords: ['repo', 'terminal', 'navigate'],
	context: CommandPaletteContextKey.Repo,
	action: {
		type: 'function',
		requestedHooks: repoNavigationRequestedHooks,
		runAction: async (providedHooks, parameters) => {
			providedHooks?.repoSideBar.setActiveItem('terminal');
		},
	},
};

// Register all navigation commands
export function useRegisterRepoNavigationCommands() {
	const commandRegistry = useCommandRegistry(undefined);

	const repoNavigationCommands = [
		navigateRepoHome,
		navigateRepoLog,
		navigateRepoStagingArea,
		navigateRepoTerminal,
	];

	useEffect(() => {
		commandRegistry.registerCommands(repoNavigationCommands);
	}, []);
}
