import { atom, useAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import { GetCustomCommands, SaveCustomCommand, DeleteCustomCommand } from '../../../wailsjs/go/backend/App';
import { backend } from '../../../wailsjs/go/models';
import { UserDefinedCommandDefinition } from '../command-palette/use-custom-command';


// Atoms for state management
const customCommandsAtom = atom<UserDefinedCommandDefinition[]>([]);
const customCommandsLoadingAtom = atom<boolean>(false);
const customCommandsErrorAtom = atom<string | null>(null);

// Helper function to convert from backend type to frontend type
function convertFromBackendType(
	backendCommand: backend.UserDefinedCommandDefinition
): UserDefinedCommandDefinition {
	return backendCommand as UserDefinedCommandDefinition;
}

// Helper function to convert from frontend type to backend type
function convertToBackendType(
	frontendCommand: UserDefinedCommandDefinition
): backend.UserDefinedCommandDefinition {
	return frontendCommand as backend.UserDefinedCommandDefinition;
}

export function useCustomCommandsState() {
	const [customCommands, setCustomCommands] = useAtom(customCommandsAtom);
	const [isLoading, setIsLoading] = useAtom(customCommandsLoadingAtom);
	const [error, setError] = useAtom(customCommandsErrorAtom);

	// Load custom commands from backend
	const loadCustomCommands = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);
			const backendCommands = await GetCustomCommands();
			const frontendCommands = backendCommands?.map(convertFromBackendType) ?? [];
			setCustomCommands(frontendCommands);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load custom commands: ' + err);
		} finally {
			setIsLoading(false);
		}
	}, [setCustomCommands, setIsLoading, setError]);

	// Save a custom command (create or update)
	const saveCustomCommand = useCallback(
		async (command: UserDefinedCommandDefinition) => {
			try {
				setError(null);
				const backendCommand = convertToBackendType(command);
				await SaveCustomCommand(backendCommand);

				// Update local state
				setCustomCommands((prev) => {
					const existingIndex = prev.findIndex((cmd) => cmd.id === command.id);
					if (existingIndex >= 0) {
						// Update existing
						const updated = [...prev];
						updated[existingIndex] = command;
						return updated;
					} else {
						// Add new
						return [...prev, command];
					}
				});
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to save custom command: ' + err);
				throw err;
			}
		},
		[setCustomCommands, setError]
	);

	// Delete a custom command
	const deleteCustomCommand = useCallback(
		async (commandId: string) => {
			try {
				setError(null);
				await DeleteCustomCommand(commandId);

				// Update local state
				setCustomCommands((prev) => prev.filter((cmd) => cmd.id !== commandId));
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to delete custom command: ' + err);
				throw err;
			}
		},
		[setCustomCommands, setError]
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
