import { ReactNode } from 'react';

// MARK: Context and associated context-data definitions
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

// MARK: Command definition

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

// Command action type that preserves the relationship between requestedHooks and action
export type CommandAction<ReqHooks> = {
	requestedHooks: () => ReqHooks;
	runAction: (providedHooks: ReqHooks, parameters: Map<string, ParameterData>) => Promise<void>;
};

// MARK: Parameter definition

type BaseCommandParameter<ReqHooks> = {
	id: string;
	prompt: string;
	required?: boolean;
	description?: string;
	placeholder?: string;
	validation?: (
		value: string,
		context: CommandPaletteContextData,
		providedHooks: ReqHooks
	) => string | undefined; // undefined = valid, string = error message
};

export type SelectOptionGroup = {
	groupKey: string;
	groupName: string;
	options: { optionKey: string; optionValue: string }[];
};
export type SelectCommandParameter<ReqHooks> = BaseCommandParameter<ReqHooks> & {
	type: 'select';
	allowCustomInput: boolean;
	options: (providedHooks: ReqHooks, parameters: Map<string, ParameterData>) => SelectOptionGroup[];
};

export type StringCommandParameter<ReqHooks> = BaseCommandParameter<ReqHooks> & {
	type: 'string';
};

export type CommandParameter<ReqHooks> = StringCommandParameter<ReqHooks> | SelectCommandParameter<ReqHooks>;

// MARK: Collected Parameter Data definition

export type ParameterData = {
	type: CommandParameter<unknown>['type'];
	id: string;
	value: string;
	validationError: string | undefined;
};
