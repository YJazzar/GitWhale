import { atom, useAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import { GetCustomCommands, SaveCustomCommand, DeleteCustomCommand, UpdateCustomCommands } from '../../../wailsjs/go/backend/App';
import { backend } from '../../../wailsjs/go/models';

// Convert from Go backend type to frontend type
export type UserDefinedCommandDefinition = {
	id: string;
	title: string;
	description?: string;
	keywords?: string[];
	context: string;
	parameters?: UserDefinedParameter[];
	action: {
		commandString: string;
	};
};

export type UserDefinedParameter = {
	id: string;
	type: 'string' | 'select';
	prompt: string;
	description?: string;
	placeholder?: string;
	required?: boolean;
	allowCustomInput?: boolean; // for select type
	options?: string[]; // for select type
};

// Atoms for state management
const customCommandsAtom = atom<UserDefinedCommandDefinition[]>([]);
const customCommandsLoadingAtom = atom<boolean>(false);
const customCommandsErrorAtom = atom<string | null>(null);

// Helper function to convert from backend type to frontend type
function convertFromBackendType(backendCommand: backend.UserDefinedCommandDefinition): UserDefinedCommandDefinition {
	return {
		id: backendCommand.id,
		title: backendCommand.title,
		description: backendCommand.description,
		keywords: backendCommand.keywords,
		context: backendCommand.context,
		parameters: backendCommand.parameters?.map(param => ({
			id: param.id,
			type: param.type as 'string' | 'select',
			prompt: param.prompt,
			description: param.description,
			placeholder: param.placeholder,
			required: param.required,
			allowCustomInput: param.allowCustomInput,
			options: param.options,
		})),
		action: {
			commandString: backendCommand.action.commandString,
		},
	};
}

// Helper function to convert from frontend type to backend type
function convertToBackendType(frontendCommand: UserDefinedCommandDefinition): backend.UserDefinedCommandDefinition {
	const backendCommand = new backend.UserDefinedCommandDefinition();
	backendCommand.id = frontendCommand.id;
	backendCommand.title = frontendCommand.title;
	backendCommand.description = frontendCommand.description;
	backendCommand.keywords = frontendCommand.keywords;
	backendCommand.context = frontendCommand.context;
	backendCommand.parameters = frontendCommand.parameters?.map(param => {
		const backendParam = new backend.UserDefinedParameter();
		backendParam.id = param.id;
		backendParam.type = param.type;
		backendParam.prompt = param.prompt;
		backendParam.description = param.description;
		backendParam.placeholder = param.placeholder;
		backendParam.required = param.required;
		backendParam.allowCustomInput = param.allowCustomInput;
		backendParam.options = param.options;
		return backendParam;
	});
	
	const backendAction = new backend.UserDefinedCommandAction();
	backendAction.commandString = frontendCommand.action.commandString;
	backendCommand.action = backendAction;
	
	return backendCommand;
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
			const frontendCommands = backendCommands.map(convertFromBackendType);
			setCustomCommands(frontendCommands);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load custom commands');
		} finally {
			setIsLoading(false);
		}
	}, [setCustomCommands, setIsLoading, setError]);

	// Save a custom command (create or update)
	const saveCustomCommand = useCallback(async (command: UserDefinedCommandDefinition) => {
		try {
			setError(null);
			const backendCommand = convertToBackendType(command);
			await SaveCustomCommand(backendCommand);
			
			// Update local state
			setCustomCommands(prev => {
				const existingIndex = prev.findIndex(cmd => cmd.id === command.id);
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
			setError(err instanceof Error ? err.message : 'Failed to save custom command');
			throw err;
		}
	}, [setCustomCommands, setError]);

	// Delete a custom command
	const deleteCustomCommand = useCallback(async (commandId: string) => {
		try {
			setError(null);
			await DeleteCustomCommand(commandId);
			
			// Update local state
			setCustomCommands(prev => prev.filter(cmd => cmd.id !== commandId));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to delete custom command');
			throw err;
		}
	}, [setCustomCommands, setError]);

	// Update all custom commands (batch operation)
	const updateCustomCommands = useCallback(async (commands: UserDefinedCommandDefinition[]) => {
		try {
			setError(null);
			const backendCommands = commands.map(convertToBackendType);
			await UpdateCustomCommands(backendCommands);
			
			// Update local state
			setCustomCommands(commands);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update custom commands');
			throw err;
		}
	}, [setCustomCommands, setError]);

	// Get a single command by ID
	const getCustomCommand = useCallback((commandId: string): UserDefinedCommandDefinition | undefined => {
		return customCommands.find(cmd => cmd.id === commandId);
	}, [customCommands]);

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
		updateCustomCommands,
		getCustomCommand,
	};
}