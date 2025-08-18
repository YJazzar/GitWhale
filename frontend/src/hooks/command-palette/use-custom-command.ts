import {
	CommandDefinition,
	CommandPaletteContextData,
	CommandPaletteContextKey,
	RepoCommandPaletteContextData
} from '@/types/command-palette';
import { useNavigateRootFilTabs } from '../navigation/use-navigate-root-file-tabs';
import { useRepoState } from '../state/repo/use-repo-state';
import { SidebarSessionKeyGenerator, useSidebarHandlers } from '../state/useSidebarHandlers';

export type UserDefinedCommandDefinition = {
	id: string;
	title: string;
	description?: string;
	keywords?: string[];
	context: CommandPaletteContextKey;
	parameters?: UserDefinedParameter[];
	action: {
		commandString: string;
	};
};

type UserDefinedParameterBase = {
	id: string;
	prompt: string;
	description?: string;
	placeholder?: string;
	required?: boolean;
};

type UserDefinedSelectParameter = UserDefinedParameterBase & {
	type: 'select';
	allowCustomInput: boolean;
	options: string[]; // must be unique in all indices
};

type UserDefinedStringParameter = UserDefinedParameterBase & {
	type: 'string';
};

export type UserDefinedParameter = UserDefinedSelectParameter | UserDefinedStringParameter;

export function useCustomCommand(
	userDefinedCommands: UserDefinedCommandDefinition[]
): CommandDefinition<ReturnType<typeof userDefinedCommandRequestedHooks>>[] {
	return userDefinedCommands.map((userDefinedCommand) => {
		return {
			id: `userDefined:${userDefinedCommand.id}`,
			title: userDefinedCommand.title,
			description: userDefinedCommand.description,
			keywords: userDefinedCommand.keywords,
			context: userDefinedCommand.context,
			parameters: userDefinedCommand.parameters?.map((param) => {
				if (param.type === 'select') {
					return {
						type: 'select',
						id: param.id,
						prompt: param.prompt,
						description: param.description,
						placeholder: param.placeholder,
						required: param.required,
						allowCustomInput: param.allowCustomInput,
						options: (providedHooks, parameters) => {
							return [
								{
									groupKey: 'mainGroup',
									groupName: '',
									options: param.options.map((option) => {
										return {
											optionKey: option.replaceAll(' ', '').toLocaleLowerCase(),
											optionValue: option,
										};
									}),
								},
							];
						},
					};
				}

				if (param.type !== 'string') {
					throw "Did we add a new parameter type that's supposed to be supported for user defined commands?";
				}

				return {
					type: 'string',
					id: param.id,
					prompt: param.prompt,
					description: param.description,
					placeholder: param.placeholder,
					required: param.required,
				};
			}),
			action: {
				type: 'terminalCommand',
				requestedHooks: (context) => {
					return userDefinedCommandRequestedHooks(context, userDefinedCommand);
				},
				runAction: async (providedHooks, parameters, commandExecutor) => {
					let constructedCommandString = userDefinedCommand.action.commandString;

					// Go through all the parameters and replace them in their placeholders
					parameters.forEach((paramData, key) => {
						if (!!paramData.value && paramData.value !== '') {
							const replaceMarker = `{{${paramData.id}}}`;
							constructedCommandString = constructedCommandString.replaceAll(replaceMarker, paramData.value);
						}
					});

					let workingDir = '';
					if (userDefinedCommand.context === CommandPaletteContextKey.Repo) {
						workingDir = providedHooks?.repoHooks.repoPath ?? ''
						if (workingDir === '') { 
							throw "Requested a repo context, but we couldn't find a repoPath to use during the command's execution"
						}
					}

		
					await commandExecutor(constructedCommandString, workingDir);
					// TODO: optionally implement in the future the ability to navigate to a specific page.
				},
			},
		};
	});
}

function userDefinedCommandRequestedHooks(
	context: CommandPaletteContextData | undefined,
	userDefinedCommand: UserDefinedCommandDefinition
) {
	if (!context) {
		return;
	}

	let repoSidebar, repoState, repoPath;
	if (userDefinedCommand.context === CommandPaletteContextKey.Repo) {
		const repoContext = context as RepoCommandPaletteContextData;
		if (repoContext.contextKey !== CommandPaletteContextKey.Repo) {
			throw 'Use defined command requested a repo context, but it received no such context';
		}

		repoPath = repoContext.repoPath;
		repoSidebar = useSidebarHandlers(SidebarSessionKeyGenerator.repoSidebar(repoContext.repoPath));
		repoState = useRepoState(repoContext.repoPath);
	}

	return {
		appHooks: {
			rootNavigator: useNavigateRootFilTabs(),
		},
		repoHooks: {
			repoPath, 
			repoSidebar,
			repoState,
		},
	};
}
