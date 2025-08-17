import { CommandPaletteContextKey } from '@/hooks/command-palette/use-command-palette-state';
import { ReactNode } from 'react';

interface GenericCommandPaletteContextData {
	contextKey: CommandPaletteContextKey;
}

export interface RepoCommandPaletteContextData {
	contextKey: CommandPaletteContextKey.Repo;
	repoPath: string;
}

export type CommandPaletteContextData = RepoCommandPaletteContextData | GenericCommandPaletteContextData;

// Parameter types for multi-step commands
export type ParameterType = 'text' | 'string' | 'selection' | 'branch' | 'commit' | 'file' | 'path';

export type ParameterData = {
	type: ParameterType;
	id: string;
	value: string;
	validationError: string | undefined;
};

export interface CommandParameter<ReqHooks> {
	id: string;
	type: ParameterType;
	prompt: string;
	placeholder?: string;
	description?: string;
	required?: boolean;
	validation?: (value: string, context: CommandPaletteContextData, providedHooks: ReqHooks) => string | undefined; // null = valid, string = error message
	suggestions?: (query: string, context: CommandPaletteContextData) => Promise<string[]>;
}

// Command action type that preserves the relationship between requestedHooks and action
export type CommandAction<ReqHooks> = {
	sideEffects: CommandActionSideEffects[];
	requestedHooks: () => ReqHooks;
	action: (providedHooks: ReqHooks, parameters: Map<string, ParameterData>) => void;
};

// Command definition with inferred hooks type
export type CommandDefinition<ReqHooks> = {
	id: string;
	title: string;
	description?: string;
	icon?: ReactNode;
	keywords?: string[]; // Additional search keywords
	context: CommandPaletteContextKey; // Which contexts this command is available in
	parameters?: CommandParameter<ReqHooks>[]; // Parameters required for execution
	action: CommandAction<ReqHooks>;
};

export enum CommandActionSideEffects {
	refreshGitLog,
}

// Search and filtering
export interface CommandSearchResult {
	command: CommandDefinition<unknown>;
	score: number;
	matchedFields: string[];
}
