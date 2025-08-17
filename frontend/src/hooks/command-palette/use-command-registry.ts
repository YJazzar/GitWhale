import { CommandDefinition } from '@/types/command-palette';
import Fuse from 'fuse.js';
import { atom, useAtom } from 'jotai';
import { useEffect, useMemo } from 'react';
import { useCommandPaletteAvailableContexts } from './use-command-palette-state';

// Global command registry - we'll populate this with commands
const registeredCommandsAtom = atom<Map<string, CommandDefinition<unknown>>>(new Map());

/**
 * Hook that provides access to the command registry
 */
export function useCommandRegistry(searchQuery: string | undefined) {
	const [_registeredCommands, _setRegisteredCommands] = useAtom(registeredCommandsAtom);
	const availableContexts = useCommandPaletteAvailableContexts();

	const _getAvailableCommands = () => {
		const availableCommands = _registeredCommands
			.values()
			.filter((command) => availableContexts.has(command.context));

		return Array.from(availableCommands);
	};

	const allAvailableCommands = _getAvailableCommands();

	useEffect(() => {
		console.debug({ _registeredCommands, availableContexts });
	}, [_registeredCommands, availableContexts]);

	const matchedCommands = useMemo(() => {
		if (!searchQuery || searchQuery === '') {
			// The hook caller isn't actually interested in getting a matching list of commands
			return [];
		}

		const availableCommands = _getAvailableCommands();

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

		// return results.map((result) => ({
		// 	command: result.item,
		// 	score: 1 - (result.score || 0), // Invert score (higher = better match)
		// 	matchedFields: result.matches?.map((match) => match.key || '') || [],
		// }));
		return results.map((result) => result.item);
	}, [availableContexts, searchQuery, _registeredCommands]);

	const registerCommands = (commands: CommandDefinition<any>[]) => {
		_setRegisteredCommands((oldRegisteredCommands) => {
			let newRegisteredCommands = new Map(oldRegisteredCommands);
			commands.forEach((command) => newRegisteredCommands.set(command.id, command));
			return newRegisteredCommands;
		});
	};

	const unregisterCommands = (commandIDs: string[]) => {
		_setRegisteredCommands((oldRegisteredCommands) => {
			let newRegisteredCommands = new Map(oldRegisteredCommands);
			commandIDs.forEach((commandID) => newRegisteredCommands.delete(commandID));
			return newRegisteredCommands;
		});
	};

	return {
		allAvailableCommands,
		matchedCommands,
		registerCommands,
		unregisterCommands,
	};
}
