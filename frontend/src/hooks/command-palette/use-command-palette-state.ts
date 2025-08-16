import { atom, useAtom, useAtomValue } from 'jotai';

// Helper types: TODO: move to a different file if they get too long
export enum CommandPaletteContextKey {
	Root,
	ApplicationLogs,
	Settings,
	Repo,
}

interface GenericCommandPaletteContextData {
	contextKey: CommandPaletteContextKey;
}

export interface RepoCommandPaletteContextData {
	contextKey: CommandPaletteContextKey.Repo;
	repoPath: string;
}

export type CommandPaletteContextData = RepoCommandPaletteContextData | GenericCommandPaletteContextData;

// Atoms for command palette state
const isCommandPaletteOpenAtom = atom(false);
const searchQueryAtom = atom('');
const availableCommandPaletteContextsAtom = atom<Map<CommandPaletteContextKey, CommandPaletteContextData>>(new Map());

// Simple hook for smaller components to see what contexts are available 
export function useCommandPaletteAvailableContexts() { 
	const availableContexts = useAtomValue(availableCommandPaletteContextsAtom)
	return availableContexts
}

/**
 * Hook for managing command palette visibility
 */
export function useCommandPaletteState() {
	const [_isOpen, _setIsOpen] = useAtom(isCommandPaletteOpenAtom);
	const [_searchQuery, _setSearchQuery] = useAtom(searchQueryAtom);
	const [_availableContexts, _setAvailableContexts] = useAtom(availableCommandPaletteContextsAtom);

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
	};
}
