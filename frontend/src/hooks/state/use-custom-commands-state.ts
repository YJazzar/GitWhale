import { atom, useAtom } from 'jotai';
import { useCallback, useEffect, useMemo } from 'react';
import { DeleteCustomCommand, SaveCustomCommand } from '../../../wailsjs/go/backend/App';
import { backend } from '../../../wailsjs/go/models';
import { UserDefinedCommandDefinition } from '../command-palette/use-custom-command';
import { UseAppState } from './use-app-state';

// Atoms for state management
const customCommandsAtom = atom<UserDefinedCommandDefinition[]>([]);
const customCommandsLoadingAtom = atom<boolean>(false);
const customCommandsErrorAtom = atom<string | null>(null);

// Helper function to convert from frontend type to backend type
function convertToBackendType(
	frontendCommand: UserDefinedCommandDefinition
): backend.UserDefinedCommandDefinition {
	return frontendCommand as backend.UserDefinedCommandDefinition;
}

export function useCustomCommandsState() {
	const appState = UseAppState();
	const [isLoading, setIsLoading] = useAtom(customCommandsLoadingAtom);
	const [error, setError] = useAtom(customCommandsErrorAtom);

	const customCommands = useMemo(() => {
		return appState.appState?.appConfig?.settings?.customCommands ?? [];
	}, [appState.appState]) as UserDefinedCommandDefinition[];

	// Load custom commands from backend
	const loadCustomCommands = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);
			await appState.refreshAppState();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load custom commands: ' + err);
		} finally {
			setIsLoading(false);
		}
	}, [setIsLoading, setError]);

	// Save a custom command (create or update)
	const saveCustomCommand = useCallback(
		async (command: UserDefinedCommandDefinition) => {
			try {
				setError(null);
				const backendCommand = convertToBackendType(command);
				await SaveCustomCommand(backendCommand);
				await appState.refreshAppState();
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to save custom command: ' + err);
				throw err;
			}
		},
		[appState.refreshAppState, setError]
	);

	// Delete a custom command
	const deleteCustomCommand = useCallback(
		async (commandId: string) => {
			try {
				setError(null);
				await DeleteCustomCommand(commandId);
				await appState.refreshAppState();
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to delete custom command: ' + err);
				throw err;
			}
		},
		[appState.refreshAppState, setError]
	);

	// Get a single command by ID
	const getCustomCommand = useCallback(
		(commandId: string): UserDefinedCommandDefinition | undefined => {
			return customCommands.find((cmd) => cmd.id === commandId);
		},
		[customCommands]
	);

	// Load commands on mount
	useEffect(() => {
		if (customCommands.length === 0 && !isLoading) {
			loadCustomCommands();
		}
	}, [customCommands.length, isLoading, loadCustomCommands]);

	return {
		customCommands,
		isLoading,
		error,
		loadCustomCommands,
		saveCustomCommand,
		deleteCustomCommand,
		getCustomCommand,
	};
}

export function useCustomCommandStateAtoms() {
	return {
		customCommandsAtom,
		customCommandsLoadingAtom,
		customCommandsErrorAtom,
	};
}
