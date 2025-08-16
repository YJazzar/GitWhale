import { CommandDefinition } from '@/types/command-palette';
import Fuse from 'fuse.js';
import { atom, useAtom } from 'jotai';
import { useMemo } from 'react';
import { CommandPaletteContextKey } from './use-command-palette-state';

// Global command registry - we'll populate this with commands
const registeredCommandsAtom = atom<Map<string, CommandDefinition>>(new Map());

/**
 * Hook that provides access to the command registry
 */
export function useCommandRegistry(
	searchQuery: string | undefined,
	availableContexts: CommandPaletteContextKey[]
) {
	const [_registeredCommands, _setRegisteredCommands] = useAtom(registeredCommandsAtom);

	const _getAvailableCommands = (availableContexts: CommandPaletteContextKey[]) => {
		const availableContextSet = new Set(availableContexts);

		const availableCommands = _registeredCommands
			.values()
			.filter((command) => availableContextSet.has(command.context));

		return Array.from(availableCommands);
	};

	const matchedCommands = useMemo(() => {
		const availableCommands = _getAvailableCommands(availableContexts);
		if (!searchQuery || !searchQuery.trim()) {
			return availableCommands.map((command) => ({
				command,
				score: 1,
				matchedFields: [],
			}));
		}

		// Configure Fuse.js for fuzzy search
		const fuse = new Fuse(availableCommands, {
			keys: [
				{ name: 'title', weight: 0.7 },
				{ name: 'description', weight: 0.2 },
				{ name: 'keywords', weight: 0.1 },
			],
			threshold: 0.4, // Lower = more strict matching
			includeScore: true,
			includeMatches: true,
		});

		const results = fuse.search(searchQuery);

		return results.map((result) => ({
			command: result.item,
			score: 1 - (result.score || 0), // Invert score (higher = better match)
			matchedFields: result.matches?.map((match) => match.key || '') || [],
		}));
	}, [availableContexts, searchQuery, _registeredCommands]);

	const registerCommand = (command: CommandDefinition) => {
		let newRegisteredCommands = new Map(_registeredCommands);
		newRegisteredCommands.set(command.id, command);
		_setRegisteredCommands(newRegisteredCommands);
	};

	const unregisterCommand = (commandID: string) => {
		let newRegisteredCommands = new Map(_registeredCommands);
		newRegisteredCommands.delete(commandID);
		_setRegisteredCommands(newRegisteredCommands);
	};

	return {
		matchedCommands,
		registerCommand,
		unregisterCommand,
	};
}
