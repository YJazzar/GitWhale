import {
	CommandDefinition,
	CommandPaletteContextData,
	CommandPaletteContextKey,
	ParameterData,
	StreamedCommandEvent,
	TerminalCommandExecutionState,
} from '@/types/command-palette';
import { atom, useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo } from 'react';
import { useCommandRegistry } from './use-command-registry';
import { ExecuteShellCommand } from '../../../wailsjs/go/backend/App';
import { EventsOn, EventsEmit, EventsOff } from '../../../wailsjs/runtime/runtime';

// Atoms for command palette state
const isCommandPaletteOpenAtom = atom(false);
const isCommandPaletteMinimizedAtom = atom(false);
const searchQueryAtom = atom('');
const availableCommandPaletteContextsAtom = atom<Map<CommandPaletteContextKey, CommandPaletteContextData>>(
	new Map()
);
const inProgressCommandAtom = atom<CommandDefinition<unknown> | undefined>(undefined);

// Simple hook for smaller components to see what contexts are available
export function useCommandPaletteAvailableContexts() {
	const availableContexts = useAtomValue(availableCommandPaletteContextsAtom);
	return availableContexts;
}

type CommandPaletteCurrentState = 'executingCommand' | 'searchingForCommand';

/**
 * Hook for managing command palette visibility
 */
export function useCommandPaletteState() {
	const [_isOpen, _setIsOpen] = useAtom(isCommandPaletteOpenAtom);
	const [_isMinimized, _setIsMinimized] = useAtom(isCommandPaletteMinimizedAtom);
	const [_searchQuery, _setSearchQuery] = useAtom(searchQueryAtom);
	const [_availableContexts, _setAvailableContexts] = useAtom(availableCommandPaletteContextsAtom);
	const [_inProgressCommand, _setInProgressCommand] = useAtom(inProgressCommandAtom);
	const _terminalCommandState = useAtomValue(terminalCommandStateAtom);

	const calculateCurrentState = (): CommandPaletteCurrentState => {
		if (!!_inProgressCommand) {
			return 'executingCommand';
		}

		return 'searchingForCommand';
	};

	const setIsOpenWrapper = (newValue: boolean) => {
		if (!_isOpen && !_isMinimized) {
			// User wants to open the command window. always allow it
			_setIsOpen(true);
			return;
		}

		if (_isOpen && _isMinimized) {
			// Currently minimized and user wants to open it, so un-minimize it
			_setIsMinimized(false);
			return;
		}

		// Otherwise, window isOpen, and it is not minimized

		// Check if a terminal command is currently executing
		const isTerminalCommandRunning = _terminalCommandState.status === 'started';
		const isExecutingCommand = calculateCurrentState() === 'executingCommand';

		if (isExecutingCommand && isTerminalCommandRunning) {
			// Minimize instead of closing when terminal command is running
			_setIsMinimized(true);
		} else {
			// Normal close behavior for other states
			_setIsOpen(false);
		}
	};

	const _onCommandPalletteClose = () => {
		_setSearchQuery('');
		_setInProgressCommand(undefined);
		_setIsMinimized(false);
	};

	// Run logic whenever the dialog is closed
	useEffect(() => {
		if (!_isOpen) {
			_onCommandPalletteClose();
		}
	});

	const getByContextKey = (contextKey: CommandPaletteContextKey) => {
		return _availableContexts.get(contextKey);
	};

	const addContext = (newContextData: CommandPaletteContextData) => {
		let newContextMap = new Map(_availableContexts);
		newContextMap.set(newContextData.contextKey, newContextData);
		_setAvailableContexts(newContextMap);
	};

	const removeContext = (contextKey: CommandPaletteContextKey) => {
		let newContextMap = new Map(_availableContexts);
		newContextMap.delete(contextKey);
		_setAvailableContexts(newContextMap);
	};

	const invokeCommand = (command: CommandDefinition<any>) => {
		if (!!_inProgressCommand) {
			return;
		}

		_setInProgressCommand(command);
	};

	return {
		isActive: {
			get: () => _isOpen,
			set: setIsOpenWrapper,
			toggle: () => setIsOpenWrapper(!_isOpen),
		},

		isMinimized: {
			get: () => _isMinimized,
		},

		searchQuery: {
			get: () => _searchQuery,
			set: _setSearchQuery,
		},

		availableContexts: {
			hasKey: (contextKey: CommandPaletteContextKey) => !!getByContextKey(contextKey),
			getByKey: getByContextKey,
			getAllContextKeys: () => Array.from(_availableContexts.keys()),
			addContext: addContext,
			removeContext: removeContext,
		},

		invokeCommand,

		currentState: calculateCurrentState(),
	};
}

const selectedCommandInSearchDialogAtom = atom('');

export function useCommandPaletteSelectionManager(autoSelectCommandOnChange: boolean) {
	const [_searchQuery, _setSearchQuery] = useAtom(searchQueryAtom);
	const [_selectedCommandID, _setSelectedCommandID] = useAtom(selectedCommandInSearchDialogAtom);

	const registry = useCommandRegistry(_searchQuery);
	const searchResults = registry.matchedCommands;

	// Decides if we should show the empty state
	const showNoCommandsFound = searchResults.length == 0 && _searchQuery.length > 0;

	// Decides which list of commands to show
	const showAllAvailableCommands = _searchQuery.length == 0;
	const commandsToShow = showAllAvailableCommands ? registry.allAvailableCommands : searchResults;

	// State variables related to the item selection
	const selectedCommandIndex = commandsToShow.findIndex((command) => command.id == _selectedCommandID);
	const selectedCommand = commandsToShow[selectedCommandIndex];

	// Auto select a new row when we can't maintain the same focus
	useEffect(() => {
		if (!autoSelectCommandOnChange) {
			return; // The component calling this hook isn't the "main" caller of the hook
		}

		if (selectedCommandIndex !== -1) {
			return; // no need to change the user's selection for them
		}

		_setSelectedCommandID(commandsToShow?.[0]?.id ?? '');
	}, [commandsToShow, selectedCommandIndex, _selectedCommandID, _setSelectedCommandID]);

	const onChangeSelectionFromArrow = (direction: 'next' | 'prev') => {
		const delta = direction === 'next' ? 1 : -1;
		const indexToSelect = selectedCommandIndex + delta;

		if (indexToSelect < 0) {
			_setSelectedCommandID(commandsToShow[commandsToShow.length - 1].id);
		} else if (indexToSelect >= commandsToShow.length) {
			_setSelectedCommandID(commandsToShow[0].id);
		} else {
			_setSelectedCommandID(commandsToShow[indexToSelect].id);
		}
	};

	const onSelectCommand = (commandID: string) => {
		// Double check that the commandID is for a valid one
		const newCommandToSelectIndex = registry.allAvailableCommands.findIndex(
			(command) => command.id === commandID
		);
		if (newCommandToSelectIndex === -1) {
			return;
		}

		_setSelectedCommandID(commandID);
	};

	return {
		showNoCommandsFound,
		commandsToShow,
		onChangeSelectionFromArrow,
		selectedCommand,
		onSelectCommand,
	};
}

export type RunActionExecutionState =
	| 'notExecuted'
	| 'executing'
	| 'finishedExecutingSuccessfully'
	| 'finishedExecutingWithError';

const parameterValuesAtom = atom(new Map<string, ParameterData>());
const runActionStateAtom = atom<RunActionExecutionState>('notExecuted');

export function useCommandPaletteExecutor() {
	const [_isCommandPaletteOpen, _setIsCommandPaletteOpen] = useAtom(isCommandPaletteOpenAtom);
	const [_availableContexts, _setAvailableContexts] = useAtom(availableCommandPaletteContextsAtom);
	const [_inProgressCommand, _setInProgressCommand] = useAtom(inProgressCommandAtom);

	const contextData = !!_inProgressCommand?.context
		? _availableContexts.get(_inProgressCommand.context)
		: undefined;
	const requestedHooks = _inProgressCommand?.action.requestedHooks(contextData);
	const shellExecutor = useCommandPaletteTerminalCommandExecutor();

	// Extract the parameter state, and set up state to track their values
	const requestedParameters = _inProgressCommand?.parameters ?? [];
	const requestedParametersMap = new Map(requestedParameters.map((param) => [param.id, param]));
	const [_parameterValues, _setParameterValues] = useAtom(parameterValuesAtom);
	const [_runActionState, _setRunActionState] = useAtom(runActionStateAtom);

	useEffect(() => {
		if (!_isCommandPaletteOpen) {
			// Cleanup whenever the command palette closes
			_setParameterValues(new Map());
			_setRunActionState('notExecuted');
		}
	}, [_isCommandPaletteOpen, _setParameterValues, _setRunActionState]);

	const onCancelInProgressCommand = () => {
		if (_runActionState === 'executing') {
			return;
		}

		_setInProgressCommand(undefined);
		shellExecutor.cancelCommand();
		_setParameterValues(new Map());
		_setRunActionState('notExecuted');
	};

	const getParameterValue = (parameterID: string) => {
		return _parameterValues.get(parameterID);
	};

	// Updates parameter values and re-runs validation for them
	const setParameterValue = async (parameterID: string, newValue: string) => {
		const paramDefinition = requestedParametersMap.get(parameterID);
		if (!paramDefinition || !_inProgressCommand) {
			return;
		}

		// Fetch the context information that's needed for the parameter
		const requestedContext = _availableContexts.get(_inProgressCommand.context);
		if (!requestedContext) {
			return;
		}

		const validationError = await paramDefinition.validation?.(
			newValue,
			requestedContext,
			requestedHooks
		);

		// Update the values
		_setParameterValues((oldParamValues) => {
			const newParamValues = new Map(oldParamValues);
			newParamValues.set(parameterID, {
				id: parameterID,
				type: paramDefinition.type,
				value: newValue,
				validationError: validationError,
			});
			return newParamValues;
		});
	};

	const canExecuteAction = useMemo(() => {
		const hasValidationErrors = _parameterValues
			.values()
			.some((param) => !!param.validationError && param.validationError !== '');
		if (hasValidationErrors) {
			return false;
		}

		const hasAllRequiredParameters = requestedParameters
			.filter((param) => param.required === true)
			.every((reqParam) => {
				const paramValue = _parameterValues.get(reqParam.id);
				return paramValue && paramValue.value.trim() !== '';
			});
		return hasAllRequiredParameters;
	}, [_parameterValues, requestedParameters]);

	const executeAction = async () => {
		if (!_inProgressCommand || !canExecuteAction || _runActionState !== 'notExecuted') {
			return;
		}

		const requestedContext = _availableContexts.get(_inProgressCommand.context);
		if (!requestedContext) {
			return;
		}

		let terminalCommandWasExecuted = false;
		const shellExecutorWrapper = async (shellCommand: string, workingDir: string) => {
			terminalCommandWasExecuted = true;
			return shellExecutor.executeShellCommand(shellCommand, workingDir);
		};

		try {
			_setRunActionState('executing');
			await _inProgressCommand.action.runAction(requestedHooks, _parameterValues, shellExecutorWrapper);
			_setRunActionState('finishedExecutingSuccessfully');

			// Only close dialog if there was no command ran
			if (!terminalCommandWasExecuted) {
				_setIsCommandPaletteOpen(false);
			}
		} catch (error) {
			console.error('Command execution failed:', error);
			_setRunActionState('finishedExecutingWithError');
		}
	};

	const optionsToShowInSelect = (parameterID: string) => {
		const paramDefinition = requestedParametersMap.get(parameterID);
		if (!paramDefinition || paramDefinition.type !== 'select') {
			return;
		}

		return paramDefinition.options(requestedHooks, _parameterValues);
	};

	return {
		_inProgressCommand: {
			value: _inProgressCommand,
			cancelInProgressCommand: onCancelInProgressCommand,
		},
		commandParameters: {
			setParameterValue,
			getParameterValue,
			getParameterSelectOptions: optionsToShowInSelect,
			allParameters: requestedParameters,
		},
		commandAction: {
			canExecuteAction,
			shouldRunImmediately: canExecuteAction && requestedParameters.length === 0,
			runAction: executeAction,
			runActionState: _runActionState,
		},
		terminalCommandState: {
			...shellExecutor.terminalCommandState,
			terminalOutput: shellExecutor.terminalCommandOutput,
			cancelTerminalCommand: shellExecutor.cancelCommand,
		},
	};
}

const terminalCommandOutputAtom = atom('');
const terminalCommandStateAtom = atom<{
	commandArgs?: string;
	commandWorkingDir?: string;
	status: 'notStarted' | 'started' | 'completed' | 'error' | 'cancelled';
	commandDuration?: string;
	exitCode?: number;
	error?: string;
	activeTopic?: string;
	terminalCommandPromise?: { resolve: (value: string) => void; reject: (value: string) => void };
}>({ status: 'notStarted' });

function useCommandPaletteTerminalCommandExecutor() {
	const [_terminalCommandOutput, _setTerminalCommandOutput] = useAtom(terminalCommandOutputAtom);
	const [_terminalCommandState, _setTerminalCommandState] = useAtom(terminalCommandStateAtom);

	const generateUniqueTopic = useCallback(() => {
		return `terminal-command-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
	}, []);

	const executeShellCommand = async (shellCommand: string, workingDir: string) => {
		let resolveCallback: ((value: string) => void) | undefined = undefined;
		let rejectCallback: ((value: string) => void) | undefined = undefined;
		const terminalCommandPromise = new Promise((resolve, reject) => {
			resolveCallback = resolve;
			rejectCallback = reject;
		});

		if (!resolveCallback || !rejectCallback) {
			throw 'Why are the promise callbacks null?';
		}

		// Generate unique topic for this command
		const topic = generateUniqueTopic();

		// Reset state
		_setTerminalCommandOutput('');
		_setTerminalCommandState({
			commandArgs: shellCommand,
			commandWorkingDir: workingDir,
			status: 'started',
			activeTopic: topic,
			commandDuration: undefined,
			exitCode: undefined,
			error: undefined,
			terminalCommandPromise: {
				resolve: resolveCallback,
				reject: rejectCallback,
			},
		});

		// Set up event listener for this command
		EventsOn(topic, (event: StreamedCommandEvent) => {
			handleCommandEvent(event, resolveCallback as any, rejectCallback as any);
		});

		try {
			// Execute the command
			await ExecuteShellCommand(shellCommand, workingDir, topic);
		} catch (error) {
			console.error('Failed to execute shell command:', error);
			_setTerminalCommandState({
				status: 'error',
				activeTopic: topic,
				commandDuration: undefined,
				exitCode: undefined,
				error: error instanceof Error ? error.message : `${error}`,
			});

			(rejectCallback as any)?.(error);
		}
		return terminalCommandPromise;
	};

	const handleCommandEvent = (
		event: StreamedCommandEvent,
		resolve: (value: unknown) => void,
		reject: (value: unknown) => void
	) => {
		switch (event.state) {
			case 'started':
				_setTerminalCommandState({
					..._terminalCommandState,
					status: 'started',
				});
				break;

			case 'output':
				if (event.output) {
					_setTerminalCommandOutput((prev) => prev + event.output + '\n');
				}
				break;

			case 'completed':
				_setTerminalCommandState({
					..._terminalCommandState,
					status: 'completed',
					commandDuration: event.duration,
					exitCode: event.exitCode,
				});

				resolve('completed');
				break;

			case 'error':
				_setTerminalCommandState({
					..._terminalCommandState,
					status: 'error',
					commandDuration: event.duration,
					exitCode: event.exitCode,
				});

				reject(event.error);
				break;

			case 'cancelled':
				_setTerminalCommandState({
					..._terminalCommandState,
					status: 'cancelled',
					commandDuration: event.duration,
					exitCode: event.exitCode,
				});
				resolve('cancelled');
				break;
		}
	};

	const cancelCommand = useCallback(() => {
		if (_terminalCommandState.activeTopic && _terminalCommandState.status === 'started') {
			// Send cancel event to the backend
			EventsEmit(_terminalCommandState.activeTopic, 'cancel');
			EventsOff(_terminalCommandState.activeTopic);
		}
	}, [_terminalCommandState.activeTopic, _terminalCommandState.status]);

	const onForceCancelCommand = useCallback(() => {
		cancelCommand();

		_setTerminalCommandOutput('');
		_setTerminalCommandState({
			commandArgs: undefined,
			commandWorkingDir: undefined,
			status: 'cancelled',
			activeTopic: undefined,
			commandDuration: undefined,
			exitCode: undefined,
			error: undefined,
			terminalCommandPromise: undefined,
		});
	}, [cancelCommand, _setTerminalCommandOutput, _setTerminalCommandState]);

	return {
		executeShellCommand,
		terminalCommandState: _terminalCommandState,
		terminalCommandOutput: _terminalCommandOutput,
		cancelCommand: onForceCancelCommand,
	};
}
