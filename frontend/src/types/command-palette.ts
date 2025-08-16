import { CommandPaletteContextKey } from '@/hooks/command-palette/use-command-palette-state';
import { ReactNode } from 'react';

export interface RootContext {
	type: 'root';
}

export interface RepoContext {
	type: 'repo';
	repoPath: string;
}

export type CommandContext = RootContext | RepoContext;

// Parameter types for multi-step commands
export type ParameterType = 'text' | 'string' | 'selection' | 'branch' | 'commit' | 'file' | 'path';

export interface CommandParameter {
	id: string;
	type: ParameterType;
	prompt: string;
	placeholder?: string;
	description?: string;
	required?: boolean;
	validation?: (value: string, context: CommandContext) => string | null; // null = valid, string = error message
	suggestions?: (query: string, context: CommandContext) => Promise<string[]>;
}

// Command actions
export interface TerminalAction {
	type: 'terminal';
	command: string;
	sideEffects: CommandActionSideEffects[];
}

export interface FunctionAction {
	type: 'function';
	handler: (params: Record<string, string>, context: CommandContext) => Promise<any>;
	sideEffects: CommandActionSideEffects[];
}

export enum CommandNavigationDestination {
	applicationHome,
	applicationLogs,
	applicationSettings,
	repoHome,
}

export interface NavigationAction {
	type: 'navigation';
	destination: CommandNavigationDestination;
	sideEffects: CommandActionSideEffects[];
}

export type CommandAction = TerminalAction | FunctionAction | NavigationAction;

// Command definition
export interface CommandDefinition {
	id: string;
	title: string;
	description?: string;
	icon?: ReactNode;
	keywords?: string[]; // Additional search keywords
	context: CommandPaletteContextKey; // Which contexts this command is available in
	parameters?: CommandParameter[]; // Parameters required for execution
	action: CommandAction;
}

export enum CommandActionSideEffects {
	refreshGitLog,
}

// Search and filtering
export interface CommandSearchResult {
	command: CommandDefinition;
	score: number;
	matchedFields: string[];
}
