import { atom, useAtom } from 'jotai';
import { useCallback, useEffect, useMemo } from 'react';
import { DeleteUserScriptCommand, SaveUserScriptCommand } from '../../../wailsjs/go/backend/App';
import { backend } from '../../../wailsjs/go/models';
import { UserDefinedCommandDefinition } from '../command-palette/use-user-script-command';
import { UseAppState } from './use-app-state';

// Atoms for state management
const userScriptCommandsLoadingAtom = atom<boolean>(false);
const userScriptCommandsErrorAtom = atom<string | null>(null);

// Helper function to convert from frontend type to backend type
function convertToBackendType(
	frontendCommand: UserDefinedCommandDefinition
): backend.UserDefinedCommandDefinition {
	return frontendCommand as backend.UserDefinedCommandDefinition;
}

export function useUserScriptCommandsState() {
	const appState = UseAppState();
	const [isLoading, setIsLoading] = useAtom(userScriptCommandsLoadingAtom);
	const [error, setError] = useAtom(userScriptCommandsErrorAtom);

	const userScriptCommands = useMemo(() => {
		return appState.appState?.appConfig?.settings?.userScriptCommands ?? [];
	}, [appState.appState]) as UserDefinedCommandDefinition[];

	// Load user script commands from backend
	const reloadUserScripts = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);
			await appState.refreshAppState();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load user script commands: ' + err);
		} finally {
			setIsLoading(false);
		}
	}, [setIsLoading, setError]);

	// Save a user script command (create or update)
	const saveUserScriptCommand = useCallback(
		async (command: UserDefinedCommandDefinition) => {
			try {
				setError(null);
				const backendCommand = convertToBackendType(command);
				await SaveUserScriptCommand(backendCommand);
				await appState.refreshAppState();
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to save user script command: ' + err);
				throw err;
			}
		},
		[appState.refreshAppState, setError]
	);

	// Delete a user script command
	const deleteUserScriptCommand = useCallback(
		async (commandId: string) => {
			try {
				setError(null);
				await DeleteUserScriptCommand(commandId);
				await appState.refreshAppState();
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to delete user script command: ' + err);
				throw err;
			}
		},
		[appState.refreshAppState, setError]
	);

	// Get a single command by ID
	const getUserScriptCommand = useCallback(
		(commandId: string): UserDefinedCommandDefinition | undefined => {
			return userScriptCommands.find((cmd) => cmd.id === commandId);
		},
		[userScriptCommands]
	);

	// Load commands on mount
	useEffect(() => {
		if (userScriptCommands.length === 0 && !isLoading) {
			reloadUserScripts();
		}
	}, [userScriptCommands.length, isLoading, reloadUserScripts]);

	return {
		userScriptCommands,
		isLoading,
		error,
		reloadUserScripts,
		saveUserScriptCommand,
		deleteUserScriptCommand,
		getUserScriptCommand,
	};
}

export function useUserScriptCommandStateAtoms() {
	return {
		userScriptCommandsLoadingAtom,
		userScriptCommandsErrorAtom,
	};
}
