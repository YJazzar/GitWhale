import { atom, useAtom } from 'jotai';
import { GetAppState } from '../../../wailsjs/go/backend/App';
import { backend } from '../../../wailsjs/go/models';
import { useEffect } from 'react';
import { useCommandRegistry } from '../command-palette/use-command-registry';
import { useCustomCommand, UserDefinedCommandDefinition } from '../command-palette/use-custom-command';

const appStateAtom = atom<backend.App | undefined>(undefined);

export const UseAppState = () => {
	const [state, setState] = useAtom(appStateAtom);
	const commandRegistry = useCommandRegistry(undefined);

	// Convert backend commands to frontend format and convert it to the real command definition
	const frontendCustomCommands = state?.appConfig?.settings?.customCommands ?? []
	const customCommandDefinitions = useCustomCommand(frontendCustomCommands as UserDefinedCommandDefinition[]);

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
