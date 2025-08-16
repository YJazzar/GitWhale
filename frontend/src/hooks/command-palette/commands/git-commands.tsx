import { CommandActionSideEffects, CommandDefinition } from '@/types/command-palette';
import { GitBranch, GitCommit, GitPullRequest } from 'lucide-react';
import { CommandPaletteContextKey } from '../use-command-palette-state';
import { useCommandRegistry } from '../use-command-registry';
import { useEffect } from 'react';

// Git: Checkout Branch
const gitCheckoutBranch: CommandDefinition = {
	id: 'repo.git.checkout.branch',
	title: 'Git: Checkout Branch',
	description: 'Switch to a different branch',
	icon: <GitBranch className="h-4 w-4" />,
	keywords: ['git', 'checkout', 'branch', 'switch'],
	context: CommandPaletteContextKey.Repo,
	parameters: [
		{
			id: 'branchName',
			type: 'branch',
			prompt: 'Branch or ref',
			placeholder: 'main, develop, feature/...',
			description: undefined,
			required: true,
			validation: (value, context) => {
				if (!value.trim()) return 'Branch name is required';
				if (value.includes(' ')) return 'Branch names cannot contain spaces';
				return null;
			},
		},
	],
	action: {
		type: 'terminal',
		command: 'git checkout {{branchName}}',
		sideEffects: [CommandActionSideEffects.refreshGitLog],
	},
};

// Git: Create Branch
const gitCreateBranch: CommandDefinition = {
	id: 'repo.git.create.branch',
	title: 'Git: Create Branch',
	description: 'Create and checkout a new branch',
	icon: <GitBranch className="h-4 w-4" />,
	keywords: ['git', 'create', 'branch', 'new'],
	context: CommandPaletteContextKey.Repo,
	parameters: [
		{
			id: 'branchName',
			type: 'string',
			prompt: 'New branch name',
			placeholder: 'feature/my-feature',
			description: 'Enter the name for the new branch',
			required: true,
			validation: (value, context) => {
				if (!value.trim()) return 'Branch name is required';
				if (value.includes(' ')) return 'Branch names cannot contain spaces';
				if (value.startsWith('-')) return 'Branch names cannot start with -';
				return null;
			},
		},
	],
	action: {
		type: 'terminal',
		command: 'git checkout -b {{branchName}}',
		sideEffects: [CommandActionSideEffects.refreshGitLog],
	},
};

// Git: Commit Changes
const gitCommit: CommandDefinition = {
	id: 'repo.git.commit',
	title: 'Git: Commit Changes',
	description: 'Commit staged changes with a message',
	icon: <GitCommit className="h-4 w-4" />,
	keywords: ['git', 'commit', 'message'],
	context: CommandPaletteContextKey.Repo,
	parameters: [
		{
			id: 'message',
			type: 'string',
			prompt: 'Commit message',
			placeholder: 'Add new feature or fix bug',
			description: 'Enter a descriptive commit message',
			required: true,
			validation: (value, context) => {
				if (!value.trim()) return 'Commit message is required';
				if (value.length < 3) return 'Commit message should be at least 3 characters';
				return null;
			},
		},
	],
	action: {
		type: 'terminal',
		command: 'git commit -m "{{message}}"',
		sideEffects: [CommandActionSideEffects.refreshGitLog],
	},
};

// Git: Pull Latest
const gitPull: CommandDefinition = {
	id: 'git.pull',
	title: 'Git: Pull Latest',
	description: 'Pull the latest changes from remote',
	icon: <GitPullRequest className="h-4 w-4" />,
	keywords: ['git', 'pull', 'fetch', 'remote'],
	context: CommandPaletteContextKey.Repo,
	action: {
		type: 'terminal',
		command: 'git pull',
		sideEffects: [CommandActionSideEffects.refreshGitLog],
	},
};

// Git: Status
const gitStatus: CommandDefinition = {
	id: 'git.status',
	title: 'Git: Status',
	description: 'Show working tree status',
	icon: <GitBranch className="h-4 w-4" />,
	keywords: ['git', 'status', 'changes'],
	context: CommandPaletteContextKey.Repo,
	action: {
		type: 'terminal',
		command: 'git status',
		sideEffects: [],
	},
};

// Register all git commands
export function useRegisterGitCommands() {
	const commandRegistry = useCommandRegistry(undefined, undefined);

	const gitCommands = [gitCheckoutBranch, gitCreateBranch, gitCommit, gitPull, gitStatus];

	useEffect(() => {
		gitCommands.forEach((command) => commandRegistry.registerCommand(command));
	}, []);
}
