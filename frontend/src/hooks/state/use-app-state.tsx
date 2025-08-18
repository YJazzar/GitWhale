import { atom, useAtom } from 'jotai';
import { GetAppState } from '../../../wailsjs/go/backend/App';
import { backend } from '../../../wailsjs/go/models';
import { useEffect } from 'react';
import { useCommandRegistry } from '../command-palette/use-command-registry';
import { useCustomCommand, UserDefinedCommandDefinition, UserDefinedParameter } from '../command-palette/use-custom-command';
import { CommandPaletteContextKey } from '@/types/command-palette';

const appStateAtom = atom<backend.App | undefined>(undefined);

export const UseAppState = () => {
	const [state, setState] = useAtom(appStateAtom);
	const commandRegistry = useCommandRegistry(undefined);

	// Convert backend commands to frontend format
	const frontendCustomCommands: UserDefinedCommandDefinition[] = state?.appConfig?.settings?.customCommands?.map(cmd => ({
		id: cmd.id,
		title: cmd.title,
		description: cmd.description,
		keywords: cmd.keywords,
		context: cmd.context === 'repo' ? CommandPaletteContextKey.Repo : CommandPaletteContextKey.Root,
		parameters: cmd.parameters?.map(param => {
			const baseParam = {
				id: param.id,
				prompt: param.prompt,
				description: param.description,
				placeholder: param.placeholder,
				required: param.required,
			};

			if (param.type === 'select') {
				return {
					...baseParam,
					type: 'select' as const,
					allowCustomInput: param.allowCustomInput || false,
					options: param.options || [],
				};
			} else {
				return {
					...baseParam,
					type: 'string' as const,
				};
			}
		}) as UserDefinedParameter[],
		action: {
			commandString: cmd.action.commandString,
		},
	})) || [];

	// Use the useCustomCommand hook to convert to CommandDefinition format
	const customCommandDefinitions = useCustomCommand(frontendCustomCommands);

	const refreshAppState = async () => {
		const newAppState = await GetAppState();
		setState(newAppState);
		return newAppState
	};

	// Auto-register custom commands when they change
	useEffect(() => {
		// Unregister old custom commands (those with userDefined: prefix)
		const existingCustomCommandIds = commandRegistry.allAvailableCommands
			.filter(cmd => cmd.id.startsWith('userDefined:'))
			.map(cmd => cmd.id);
		
		if (existingCustomCommandIds.length > 0) {
			commandRegistry.unregisterCommands(existingCustomCommandIds);
		}

		// Register new custom commands
		if (customCommandDefinitions.length > 0) {
			commandRegistry.registerCommands(customCommandDefinitions);
		}
	}, [customCommandDefinitions, commandRegistry]);

	useEffect(() => {
		if (!!state) {
			return;
		}

		refreshAppState();
	}, [state, setState]);

	// Helper function, idk if it's that helpful
	const executeAndRefreshState = async (func: () => Promise<backend.App>) => {
		let newState = await func();
		setState(newState);
	};

	return { appState: state, refreshAppState, executeAndRefreshState };
};
