import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useCommandPaletteExecutor } from '@/hooks/command-palette/use-command-palette-state';
import { cn } from '@/lib/utils';
import { CommandParameter, SelectCommandParameter, SelectOptionGroup } from '@/types/command-palette';
import { CheckCircle, ChevronsUpDown, Loader2 } from 'lucide-react';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '../empty-state';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { CommandPaletteTerminalShell } from './CommandPaletteTerminalShell';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';

export function CommandPaletteExecutor() {
	const commandExecutor = useCommandPaletteExecutor();
	const inProgressCommand = commandExecutor._inProgressCommand.value;

	const { allParameters } = commandExecutor.commandParameters;
	const commandAction = commandExecutor.commandAction;

	// Allows the user to back up to the initial menu
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			switch (e.key) {
				case 'Escape':
					e.preventDefault();
					commandExecutor._inProgressCommand.cancelInProgressCommand();
					break;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [commandExecutor._inProgressCommand.cancelInProgressCommand]);

	// Handle immediate execution for commands without parameters
	useEffect(() => {
		if (commandAction.shouldRunImmediately) {
			commandAction.runAction();
		}
	}, [commandAction.shouldRunImmediately, commandAction.runAction]);

	// Handle Enter key for form submission
	useKeyboardShortcut('Enter', () => {
		commandAction.runAction();
	});

	if (!inProgressCommand) {
		// This should be guarded against already in the parent component, but just in case
		return (
			<EmptyState
				title={() => (
					<>Error: we got tricked into executing a command, but we don't know which one! </>
				)}
				message={"I cAn'T BeLeIve YoU'vE DoNe ThIs"}
			/>
		);
	}

	// Show the terminal command as it's executing
	if (inProgressCommand.action.type === 'terminalCommand') {
		if (
			commandAction.runActionState === 'executing' ||
			commandAction.runActionState === 'finishedExecutingWithError' ||
			commandAction.runActionState === 'finishedExecutingSuccessfully'
		) {
			return <CommandPaletteTerminalShell />;
		}
	}

	// Show completion state
	if (commandAction.runActionState === 'finishedExecutingSuccessfully') {
		return (
			<div className="p-8 text-center">
				<div className="text-green-500 mb-4">
					<CheckCircle className="w-8 h-8 mx-auto" />
				</div>
				<h3 className="text-lg font-semibold mb-2">Command Completed Successfully</h3>
				<p className="text-sm text-muted-foreground mb-4">
					The command "{inProgressCommand.title}" has finished executing.
				</p>
				<p className="text-xs text-muted-foreground">
					Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> to close
				</p>
			</div>
		);
	}

	// TODO: Show a failure case

	// Show progress bar for immediate execution
	if (commandAction.shouldRunImmediately && commandAction.runActionState === 'executing') {
		return (
			<div className="p-8 text-center">
				<div className="mb-4">
					<Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
				</div>
				<h3 className="text-lg font-semibold mb-2">Executing Command</h3>
				<p className="text-sm text-muted-foreground">Running "{inProgressCommand.title}"...</p>
			</div>
		);
	}

	// Show parameter form
	return (
		<div className="p-4 space-y-4">
			<div className="mb-4">
				<h3 className="text-lg font-semibold mb-1">{inProgressCommand.title}</h3>
				{inProgressCommand.description && (
					<p className="text-sm text-muted-foreground">{inProgressCommand.description}</p>
				)}
			</div>

			<div className="space-y-3">
				{allParameters.map((parameter, index) => {
					return (
						<CommandPaletteParameter
							key={parameter.id}
							parameter={parameter}
							focusOnMount={index === 0}
						/>
					);
				})}
			</div>

			<div className="pt-4">
				<div className="flex items-center justify-between">
					<div></div>
					<Button
						onClick={() => {
							commandAction.runAction();
						}}
						disabled={
							!commandAction.canExecuteAction || commandAction.runActionState !== 'notExecuted'
						}
						size="sm"
					>
						{commandAction.runActionState === 'executing' && (
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						)}
						Execute Command
					</Button>
				</div>
			</div>
		</div>
	);
}

function CommandPaletteParameter<T>(props: { parameter: CommandParameter<T>; focusOnMount: boolean }) {
	const commandExecutor = useCommandPaletteExecutor();
	const { setParameterValue, getParameterValue } = commandExecutor.commandParameters;
	const { parameter, focusOnMount } = props;

	const inputRef = useRef<HTMLInputElement | HTMLButtonElement>(null);
	const paramValue = getParameterValue(parameter.id);
	const hasError = paramValue?.validationError;

	let inputElement;
	if (parameter.type === 'string') {
		inputElement = (
			<Input
				ref={inputRef as React.RefObject<HTMLInputElement>}
				placeholder={parameter.placeholder}
				value={paramValue?.value || ''}
				onChange={(e) => setParameterValue(parameter.id, e.target.value)}
				className={cn(hasError && 'border-red-500 focus:border-red-500')}
			/>
		);
	} else if (parameter.type === 'select') {
		inputElement = (
			<CommandPaletteSelectParameterInput
				ref={inputRef as React.RefObject<HTMLButtonElement>}
				parameter={parameter}
				focusOnMount={focusOnMount}
			/>
		);
	} else {
		inputElement = (
			<h1>
				Error: failed to map the command parameter to an input element. Did we add a new type
				recently?
			</h1>
		);
	}

	useEffect(() => {
		if (inputRef.current && focusOnMount) {
			inputRef.current.focus();
		}
	}, [focusOnMount]);

	return (
		<div key={parameter.id} className="space-y-1">
			<label className="text-sm font-medium flex items-center gap-1">
				{parameter.prompt}
				{parameter.required && <span className="text-red-500">*</span>}
			</label>

			{parameter.description && (
				<p className="text-xs text-muted-foreground">{parameter.description}</p>
			)}

			{inputElement}

			{hasError && <p className="text-xs text-red-500">{hasError}</p>}
		</div>
	);
}

const CommandPaletteSelectParameterInput = forwardRef<
	HTMLButtonElement,
	{ parameter: SelectCommandParameter<never>; focusOnMount: boolean }
>((props, ref) => {
	const commandExecutor = useCommandPaletteExecutor();
	const { setParameterValue, getParameterValue } = commandExecutor.commandParameters;
	const { parameter } = props;

	const [isSelectPopupOpen, setIsSelectPopupOpen] = useState(false);
	const optionGroups = commandExecutor.commandParameters.getParameterSelectOptions(parameter.id) ?? [];

	const paramValue = getParameterValue(parameter.id);
	const hasError = paramValue?.validationError;

	const onParamValueChange = (newValue: string) => {
		setParameterValue(parameter.id, newValue);
		setIsSelectPopupOpen(false);
	};

	const allOptionsMap = useMemo(() => {
		const optionMap = new Map<string, SelectOptionGroup['options'][0]>();

		optionGroups.forEach((group) => {
			group.options.forEach((option) => {
				optionMap.set(option.optionKey, option);
			});
		});
		return optionMap;
	}, [optionGroups]);

	return (
		<TooltipProvider>
			<Popover open={isSelectPopupOpen} onOpenChange={setIsSelectPopupOpen} modal={true}>
				<PopoverTrigger asChild>
					<Button
						ref={ref}
						variant="outline"
						role="combobox"
						aria-expanded={isSelectPopupOpen}
						className={cn('w-full *:justify-between font-normal', hasError && 'border-red-500')}
					>
						{/* The name of the ref */}
						<div className="flex w-full gap-1 min-w-0">
							<span className={cn('truncate')}>
								{allOptionsMap.get(paramValue?.value ?? '')?.optionValue}
							</span>
						</div>

						<ChevronsUpDown className="w-4 h-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[300px] p-0" align="start">
					<Command>
						<CommandInput
							placeholder="Search references or enter custom..."
							className="h-9"
							value={paramValue?.value}
							onValueChange={(newOptionKey) => setParameterValue(parameter.id, newOptionKey)}
						/>
						<CommandList>
							<CommandEmpty>No references found.</CommandEmpty>
							{/* Group by type */}
							{optionGroups.map((optionGroup) => {
								return (
									<CommandGroup key={optionGroup.groupKey} heading={optionGroup.groupName}>
										{optionGroup.options.map((option) => (
											<CommandItem
												key={option.optionKey}
												value={option.optionKey}
												onSelect={onParamValueChange}
												className="flex items-center justify-between"
											>
												<span>{option.optionValue}</span>
											</CommandItem>
										))}
									</CommandGroup>
								);
							})}

							{!!paramValue?.value && (
								<CommandGroup heading="New repo">
									<CommandItem
										value={paramValue.value}
										onSelect={onParamValueChange}
										className={cn('flex items-center justify-between')}
									>
										<div className="flex flex-col">
											<div className="flex items-center gap-2">
												<span className="italic">{paramValue?.value}</span>
											</div>
										</div>
									</CommandItem>
								</CommandGroup>
							)}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</TooltipProvider>
	);
});
