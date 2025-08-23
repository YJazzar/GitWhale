import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { SidebarSessionKeyGenerator, useSidebarHandlers } from '@/hooks/state/useSidebarHandlers';
import {
	CommandDefinition,
	CommandPaletteContextData,
	CommandPaletteContextKey,
	RepoCommandPaletteContextData,
} from '@/types/command-palette';
import { DownloadCloud, GitBranch } from 'lucide-react';
import { useEffect } from 'react';
import { ValidateRef } from '../../../../wailsjs/go/backend/App';
import { useCommandRegistry } from '../use-command-registry';

type CommandDefinitionWithRepoState = CommandDefinition<
	ReturnType<typeof commandWithRepoStateRequestedHooks> | undefined
>;
function commandWithRepoStateRequestedHooks(contextData: CommandPaletteContextData | undefined) {
	if (!contextData || contextData.contextKey !== CommandPaletteContextKey.Repo) {
		return;
	}

	const repoContextData = contextData as RepoCommandPaletteContextData;
	const repoSideBar = useSidebarHandlers(SidebarSessionKeyGenerator.repoSidebar(repoContextData.repoPath));
	const repoState = useRepoState(repoContextData.repoPath);

	useEffect(() => {
		if (!repoState.logState.refs?.length) {
			repoState.logState.refreshRefs();
		}
	}, []);

	return {
		repoPath: repoContextData.repoPath,
		repoSideBar,
		repoState: repoState,
	};
}

// Git: Checkout Branch
const gitCheckoutBranch: CommandDefinitionWithRepoState = {
	id: 'repo.git.checkout.branch',
	title: 'Git: Checkout Branch',
	description: 'Switch to a different branch',
	icon: <GitBranch className="h-4 w-4" />,
	keywords: ['git', 'checkout', 'branch', 'switch'],
	context: CommandPaletteContextKey.Repo,
	parameters: [
		{
			id: 'branchName',
			type: 'select',
			prompt: 'Branch or ref',
			placeholder: 'main, develop, feature/...',
			required: true,
			allowCustomInput: true,
			validation: async (refToValidate, context, providedHooks) => {
				if (!refToValidate.trim()) return 'A ref is required';
				if (refToValidate.includes(' ')) return 'Ref names cannot contain spaces';

				if (providedHooks?.repoState?.logState.refs?.some((ref) => ref.name === refToValidate)) {
					return undefined;
				}

				if (context.contextKey !== CommandPaletteContextKey.Repo) {
					return 'Running with the wrong context type';
				}

				const repoContext = context as RepoCommandPaletteContextData;
				const isValid = await ValidateRef(repoContext.repoPath, refToValidate);

				return isValid ? undefined : 'Invalid ref';
			},
			options: (providedHooks) => {
				if (!providedHooks) {
					return [];
				}

				const getRefTypeLabel = (type: string) => {
					switch (type) {
						case 'commit':
							return '';
						case 'localBranch':
							return 'Local Branches';
						case 'remoteBranch':
							return 'Remote Branches';
						case 'tag':
							return 'Tags';
						default:
							return 'References';
					}
				};

				const { logState } = providedHooks.repoState;
				const allRefs = logState.refs ?? [];
				return ['commit', 'localBranch', 'remoteBranch', 'tag'].map((type) => {
					const refsOfType = allRefs.filter((ref) => ref.type === type);
					return {
						groupKey: type,
						groupName: getRefTypeLabel(type),
						options: refsOfType.map((ref) => {
							return {
								optionKey: ref.name,
								optionValue: ref.name,
							};
						}),
					};
				});
			},
		},
	],
	action: {
		type: 'terminalCommand',
		requestedHooks: commandWithRepoStateRequestedHooks,
		runAction: async (providedHooks, parameters, commandExecutor) => {
			const branchName = parameters.get('branchName');
			if (!branchName?.value) {
				throw 'Need to provide a branchName';
			}
			if (!providedHooks?.repoPath) {
				throw 'Need to always have a repo path';
			}

			const command = `git checkout ${branchName.value}`;
			await commandExecutor(command, providedHooks.repoPath);
			providedHooks?.repoSideBar.setActiveItem('log');
			providedHooks?.repoState?.logState.refreshLogAndRefs();
		},
	},
};

// // Git: Create Branch
// const gitCreateBranch: CommandDefinitionWithRepoState = {
// 	id: 'repo.git.create.branch',
// 	title: 'Git: Create Branch',
// 	description: 'Create and checkout a new branch',
// 	icon: <GitBranch className="h-4 w-4" />,
// 	keywords: ['git', 'create', 'branch', 'new'],
// 	context: CommandPaletteContextKey.Repo,
// 	parameters: [
// 		{
// 			id: 'branchName',
// 			type: 'string',
// 			prompt: 'New branch name',
// 			placeholder: 'feature/my-feature',
// 			description: 'Enter the name for the new branch',
// 			required: true,
// 			validation: async (value, context, providedHooks) => {
// 				if (!value.trim()) return 'Branch name is required';
// 				if (value.includes(' ')) return 'Branch names cannot contain spaces';
// 				if (value.startsWith('-')) return 'Branch names cannot start with -';

// 				if (providedHooks?.repoState?.logState.refs?.some((ref) => ref.name === value)) {
// 					return 'Branch name already in use';
// 				}

// 				return undefined;
// 			},
// 		},
// 	],
// 	action: {
// 		// command: 'git checkout -b {{branchName}}',
// 		requestedHooks: commandWithRepoStateRequestedHooks,
// 		runAction: async (providedHooks, parameters) => {
// 			// TODO: fill in with the right thing once terminal is supported
// 			providedHooks?.repoState?.logState.refreshLogAndRefs();
// 		},
// 	},
// };

// // Git: Commit Changes
// const gitCommit: CommandDefinitionWithRepoState = {
// 	id: 'repo.git.commit',
// 	title: 'Git: Commit Changes',
// 	description: 'Commit staged changes with a message',
// 	icon: <GitCommit className="h-4 w-4" />,
// 	keywords: ['git', 'commit', 'message'],
// 	context: CommandPaletteContextKey.Repo,
// 	parameters: [
// 		{
// 			id: 'message',
// 			type: 'string',
// 			prompt: 'Commit message',
// 			placeholder: 'Add new feature or fix bug',
// 			description: 'Enter a descriptive commit message',
// 			required: true,
// 			validation: async (value, context, providedHooks) => {
// 				if (!value.trim()) return 'Commit message is required';
// 				if (value.length < 3) return 'Commit message should be at least 3 characters';
// 				return undefined;
// 			},
// 		},
// 	],
// 	action: {
// 		// command: 'git commit -m "{{message}}"',
// 		requestedHooks: commandWithRepoStateRequestedHooks,
// 		runAction: async (providedHooks, parameters) => {
// 			// TODO: fill in with the right thing once terminal is supported
// 			providedHooks?.logState.refreshLogAndRefs();
// 		},
// 	},
// };

// // Git: Pull Latest
// const gitPull: CommandDefinitionWithRepoState = {
// 	id: 'git.pull',
// 	title: 'Git: Pull Latest',
// 	description: 'Pull the latest changes from remote',
// 	icon: <GitPullRequest className="h-4 w-4" />,
// 	keywords: ['git', 'pull', 'fetch', 'remote'],
// 	context: CommandPaletteContextKey.Repo,
// 	action: {
// 		// command: 'git pull',
// 		requestedHooks: commandWithRepoStateRequestedHooks,
// 		runAction: async (providedHooks, parameters) => {
// 			// TODO: fill in with the right thing once terminal is supported
// 			providedHooks?.logState.refreshLogAndRefs();
// 		},
// 	},
// };

// Git: Status
const gitStatus: CommandDefinitionWithRepoState = {
	id: 'git.status',
	title: 'Git: Status',
	icon: <GitBranch className="h-4 w-4" />,
	keywords: ['git', 'status', 'changes'],
	context: CommandPaletteContextKey.Repo,
	parameters: [],
	action: {
		type: 'terminalCommand',
		requestedHooks: commandWithRepoStateRequestedHooks,
		runAction: async (providedHooks, parameters, commandExecutor) => {
			if (!providedHooks?.repoPath) {
				throw 'Need to always have a repo path';
			}

			const command = `git status`;
			await commandExecutor(command, providedHooks.repoPath);
		},
	},
};

// Git: Status
const gitFetch: CommandDefinitionWithRepoState = {
	id: 'git.fetch',
	title: 'Git: Fetch',
	icon: <DownloadCloud className="h-4 w-4" />,
	keywords: ['git', 'status', 'changes'],
	context: CommandPaletteContextKey.Repo,
	parameters: [],
	action: {
		type: 'terminalCommand',
		requestedHooks: commandWithRepoStateRequestedHooks,
		runAction: async (providedHooks, parameters, commandExecutor) => {
			if (!providedHooks?.repoPath) {
				throw 'Need to always have a repo path';
			}

			const command = `git fetch`;
			await commandExecutor(command, providedHooks.repoPath);
			providedHooks?.repoSideBar.setActiveItem('log');
			providedHooks?.repoState?.logState.refreshLogAndRefs();
		},
	},
};

// Register all git commands
export function useRegisterGitCommands() {
	const commandRegistry = useCommandRegistry(undefined);

	useEffect(() => {
		const gitCommands = [gitCheckoutBranch, gitStatus, gitFetch];

		commandRegistry.registerCommands(gitCommands as CommandDefinition<unknown>[]);
	}, []);
}
