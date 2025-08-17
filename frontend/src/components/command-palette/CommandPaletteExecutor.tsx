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
import { CommandParameter } from '@/types/command-palette';
import { CheckCircle, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState } from '../empty-state';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export function CommandPaletteExecutor() {
	const commandExecutor = useCommandPaletteExecutor();
	const inProgressCommand = commandExecutor._inProgressCommand.value;

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

	const { allParameters } = commandExecutor.commandParameters;
	const commandAction = commandExecutor.commandAction;
	console.log(commandExecutor.commandAction.canExecuteAction)

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
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				commandAction.runAction();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [commandAction.runAction]);

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
				{allParameters.map((parameter) => {
					return <CommandPaletteParameter key={parameter.id} parameter={parameter} />;
				})}
			</div>

			<div className="pt-4 border-t">
				<div className="flex items-center justify-between">
					<div className="text-xs text-muted-foreground">
						Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> to execute
					</div>
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
						Execute Command {JSON.stringify({canExe: commandAction.canExecuteAction},null, 3 )}
					</Button>
				</div>
			</div>
		</div>
	);
}

function CommandPaletteParameter<T>(props: { parameter: CommandParameter<T> }) {
	const commandExecutor = useCommandPaletteExecutor();
	const { setParameterValue, getParameterValue } = commandExecutor.commandParameters;
	const { parameter } = props;

	const paramValue = getParameterValue(parameter.id);
	const hasError = paramValue?.validationError;

	let inputElement;
	if (parameter.type === 'string') {
		inputElement = (
			<Input
				placeholder={parameter.placeholder}
				value={paramValue?.value || ''}
				onChange={(e) => setParameterValue(parameter.id, e.target.value)}
				className={cn(hasError && 'border-red-500 focus:border-red-500')}
			/>
		);
	} else if (parameter.type === 'select') {
		inputElement = <CommandPaletteSelectParameterInput parameter={parameter} />;
	} else {
		inputElement = (
			<h1>
				Error: failed to map the command parameter to an input element. Did we add a new type
				recently?
			</h1>
		);
	}

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

function CommandPaletteSelectParameterInput<T>(props: { parameter: CommandParameter<T> }) {
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

	return (
		<TooltipProvider>
			<Popover open={isSelectPopupOpen} onOpenChange={setIsSelectPopupOpen} modal={true}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={isSelectPopupOpen}
						className={cn('w-full *:justify-between font-normal', hasError && 'border-red-500')}
					>
						{/* The name of the ref */}
						<div className="flex w-full gap-1 min-w-0">
							<span className={cn('truncate')}>{paramValue?.value}</span>
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
							onValueChange={(newValue) => setParameterValue(parameter.id, newValue)}
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
												value={option.optionValue}
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
}
