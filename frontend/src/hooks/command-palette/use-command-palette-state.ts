import {
	CommandDefinition,
	CommandPaletteContextData,
	CommandPaletteContextKey,
	ParameterData,
} from '@/types/command-palette';
import { atom, useAtom, useAtomValue } from 'jotai';
import { useCommandRegistry } from './use-command-registry';
import { useEffect, useState } from 'react';

// Atoms for command palette state
const isCommandPaletteOpenAtom = atom(false);
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
	const [_searchQuery, _setSearchQuery] = useAtom(searchQueryAtom);
	const [_availableContexts, _setAvailableContexts] = useAtom(availableCommandPaletteContextsAtom);
	const [_inProgressCommand, _setInProgressCommand] = useAtom(inProgressCommandAtom);

	const _onCommandPalletteClose = () => {
		_setSearchQuery('');
	};

	const setIsOpenWrapper = (newValue: boolean) => {
		_setIsOpen(newValue);
		if (!newValue) {
			_onCommandPalletteClose();
		}
	};

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

	const calculateCurrentState = (): CommandPaletteCurrentState => {
		if (!!_inProgressCommand) {
			return 'executingCommand';
		}

		return 'searchingForCommand';
	};

	return {
		isActive: {
			get: () => _isOpen,
			set: setIsOpenWrapper,
			toggle: () => setIsOpenWrapper(!_isOpen),
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
	const [_isOpen, _setIsOpen] = useAtom(isCommandPaletteOpenAtom);
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

	return {
		showNoCommandsFound,
		commandsToShow,
		onChangeSelectionFromArrow,
		selectedCommand: selectedCommand,
	};
}

export type RunActionExecutionState = 'notExecuted' | 'executing' | 'finishedExecutingSuccessfully' | 'finishedExecutingWithError'

export function useCommandPaletteExecutor() {
	const [_availableContexts, _setAvailableContexts] = useAtom(availableCommandPaletteContextsAtom);
	const [_inProgressCommand, _setInProgressCommand] = useAtom(inProgressCommandAtom);
	const requestedHooks = _inProgressCommand?.action.requestedHooks();

	// Extract the parameter state, and set up state to track their values
	const requestedParameters = _inProgressCommand?.parameters ?? [];
	const requestedParametersMap = new Map(requestedParameters.map((param) => [param.id, param]));
	const [_parameterValues, _setParameterValues] = useState(new Map<string, ParameterData>());

	const [_runActionState, _setRunActionState] = useState<RunActionExecutionState>('notExecuted')

	const getParameterValue = (parameterID: string) => {
		return _parameterValues.get(parameterID);
	};

	// Updates parameter values and re-runs validation for them
	const setParameterValue = (parameterID: string, newValue: string) => {
		const paramDefinition = requestedParametersMap.get(parameterID);
		if (!paramDefinition || !_inProgressCommand) {
			return;
		}

		// Fetch the context information that's needed for the parameter
		const requestedContext = _availableContexts.get(_inProgressCommand.context);
		if (!requestedContext) {
			return;
		}

		// Update the values
		_setParameterValues((oldParamValues) => {
			const newParamValues = new Map(oldParamValues);
			newParamValues.set(parameterID, {
				id: parameterID,
				type: paramDefinition.type,
				value: newValue,
				validationError: paramDefinition.validation?.(newValue, requestedContext, requestedHooks),
			});
			return newParamValues;
		});
	};

	const canExecuteAction = (() => {
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
	})();

	const executeAction = async () => {
		if (!_inProgressCommand || !canExecuteAction || _runActionState !== 'notExecuted') {
			return;
		}

		const requestedContext = _availableContexts.get(_inProgressCommand.context);
		if (!requestedContext) {
			return;
		}

		try {
			_setRunActionState('executing')
			await _inProgressCommand.action.runAction(requestedHooks, _parameterValues);
			_setRunActionState('finishedExecutingSuccessfully')
		} catch (error) {
			console.error('Command execution failed:', error);
			_setRunActionState('finishedExecutingWithError')
		}
	};

	return {
		_inProgressCommand: {
			value: _inProgressCommand,
			onFinishedExecuting: () => _setInProgressCommand(undefined),
		},

		commandParameters: {
			setParameterValue,
			getParameterValue,
			allParameters: requestedParameters,
		},

		commandAction: {
			canExecuteAction,
			shouldRunImmediately: canExecuteAction && requestedParameters.length === 0,
			runAction: executeAction,
			runActionState: _runActionState
		},
	};
}
