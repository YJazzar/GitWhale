import { useAtomValue } from 'jotai';
import { UseAppState } from './use-app-state';
import { useAppLogState } from './use-app-log-state';
import { useCommandPaletteState, useCommandPaletteAvailableContexts } from '../command-palette/use-command-palette-state';
import { useSidebarState } from './useSidebarState';
import { useCustomCommandsState } from './use-custom-commands-state';

// Hook to get all application state values for debugging
export function useStateInspectorValues() {
	// Core app state
	const appState = UseAppState();
	
	// Log state
	const logState = useAppLogState();
	
	// Command palette state
	const commandPaletteState = useCommandPaletteState();
	const commandPaletteContexts = useCommandPaletteAvailableContexts();
	
	// Sidebar state
	const sidebarState = useSidebarState();
	
	// Custom commands state
	const customCommandsState = useCustomCommandsState();

	return {
		// Core Application State
		coreState: {
			appConfig: appState.appState?.appConfig,
			appConfigLoaded: !!appState.appState,
		},
		
		// Logging State
		logState: {
			filterLevel: logState.filterLevel.get(),
			isLoading: logState.isLoading,
			terminalInstance: !!logState.terminal,
		},
		
		// Command Palette State
		commandPaletteState: {
			dialogVisualState: commandPaletteState.dialogVisualState.get(),
			searchQuery: commandPaletteState.searchQuery.get(),
			currentState: commandPaletteState.currentState,
			availableContextKeys: commandPaletteState.availableContexts.getAllContextKeys(),
			availableContextsMap: commandPaletteContexts,
		},
		
		// Sidebar State
		sidebarState: {
			currentRepoPath: sidebarState.currentRepoPath.get(),
			sidebarSelection: sidebarState.sidebarSelection.get(),
		},
		
		// Custom Commands State
		customCommandsState: {
			commands: customCommandsState.commands.get(),
			selectedCommandId: customCommandsState.selectedCommandId.get(),
		},
	};
}

// Individual atom value hooks for more granular access
export function useAppStateAtomValue() {
	const appState = UseAppState();
	return {
		appConfig: appState.appState?.appConfig,
		isLoaded: !!appState.appState,
		refreshFunction: appState.refreshAppState,
	};
}

export function useAppLogStateAtomValue() {
	const logState = useAppLogState();
	return {
		filterLevel: logState.filterLevel.get(),
		isLoading: logState.isLoading,
		hasTerminal: !!logState.terminal,
		clearLogs: logState.clearLogs,
		fitTerminal: logState.fitTerminal,
	};
}

export function useCommandPaletteStateAtomValue() {
	const state = useCommandPaletteState();
	const contexts = useCommandPaletteAvailableContexts();
	
	return {
		dialogVisualState: state.dialogVisualState.get(),
		searchQuery: state.searchQuery.get(),
		currentState: state.currentState,
		availableContextKeys: state.availableContexts.getAllContextKeys(),
		availableContextsMap: contexts,
		hasContexts: contexts.size > 0,
	};
}

export function useSidebarStateAtomValue() {
	const state = useSidebarState();
	return {
		currentRepoPath: state.currentRepoPath.get(),
		sidebarSelection: state.sidebarSelection.get(),
	};
}

export function useCustomCommandsStateAtomValue() {
	const state = useCustomCommandsState();
	return {
		commands: state.commands.get(),
		selectedCommandId: state.selectedCommandId.get(),
		commandCount: state.commands.get()?.length || 0,
	};
}

// File tabs state hooks
export function useFileTabsStateAtomValue() {
	// Note: File tabs state is session-based, so we'll need to handle this differently
	// For now, return a placeholder that shows this needs session keys
	return {
		note: 'File tabs state is session-based and requires specific session keys',
		sessionBased: true,
	};
}

// Repository-specific state hooks would need repo paths
export function useRepoStateAtomValue(repoPath?: string) {
	return {
		note: `Repository state for: ${repoPath || 'No repo specified'}`,
		repoPath: repoPath,
		hasRepo: !!repoPath,
	};
}