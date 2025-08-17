import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
	useCommandPaletteExecutor,
	useCommandPaletteSelectionManager,
	useCommandPaletteState,
} from '@/hooks/command-palette/use-command-palette-state';
import { CommandIcon, CheckCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CommandInput } from './CommandInput';
import { CommandPaletteItem } from './CommandItem';
import { EmptyState } from '../empty-state';
import { cn } from '@/lib/utils';

export function CommandPalette() {
	const commandPaletteState = useCommandPaletteState();
	const selectionManager = useCommandPaletteSelectionManager(true);

	// Helpful aliases
	const isActive = commandPaletteState.isActive;
	const onChangeSelectionFromArrow = selectionManager.onChangeSelectionFromArrow;
	const commandsToShow = selectionManager.commandsToShow;

	// Handle keyboard navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isActive.get()) return;

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					onChangeSelectionFromArrow('next');
					break;
				case 'ArrowUp':
					e.preventDefault();
					onChangeSelectionFromArrow('prev');
					break;
				case 'Escape':
					e.preventDefault();
					isActive.set(false);
					break;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isActive.get(), isActive.set, onChangeSelectionFromArrow]);

	const isSearchingForCommand = commandPaletteState.currentState === 'searchingForCommand';
	const isExecutingCommand = commandPaletteState.currentState === 'executingCommand';

	return (
		<Dialog open={isActive.get()} onOpenChange={isActive.set} modal>
			<DialogContent hideCloseIcon className="sm:max-w-[600px] p-0 gap-0 h-[400px] flex flex-col">
				{/* Search Input */}
				<div className="p-4 border-b">
					<CommandInput />
				</div>

				{/* Command List */}
				<ScrollArea className="flex-1">
					{isSearchingForCommand && <CommandPaletteSearch />}
					{isExecutingCommand && <CommandPaletteExecutor />}
				</ScrollArea>

				{/* Footer */}
				<div className="p-3 border-t bg-muted/30">
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<div className="flex items-center gap-4">
							<span>↑↓ to navigate</span>
							<span>↵ to select</span>
							<span>Esc to close</span>
						</div>
						<div>
							{commandsToShow.length} command
							{commandsToShow.length !== 1 ? 's' : ''}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function CommandPaletteSearch() {
	const selectionManager = useCommandPaletteSelectionManager(false);
	const commandsToShow = selectionManager.commandsToShow;

	return (
		<div className="p-2">
			{selectionManager.showNoCommandsFound && (
				<div className="text-center py-8 text-muted-foreground">
					<CommandIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
					<p className="text-sm">No commands found</p>
					<p className="text-xs mt-1">Try adjusting your search</p>
				</div>
			)}

			{commandsToShow.length > 0 && (
				<div className="space-y-1">
					{commandsToShow.map((command) => (
						<CommandPaletteItem
							key={command.id}
							command={command}
							isSelected={selectionManager.selectedCommand?.id === command.id}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function CommandPaletteExecutor() {
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

	const { allParameters, setParameterValue, getParameterValue } = commandExecutor.commandParameters;
	const commandAction = commandExecutor.commandAction;

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
					const paramValue = getParameterValue(parameter.id);
					const hasError = paramValue?.validationError;

					return (
						<div key={parameter.id} className="space-y-1">
							<label className="text-sm font-medium flex items-center gap-1">
								{parameter.prompt}
								{parameter.required && <span className="text-red-500">*</span>}
							</label>

							{parameter.description && (
								<p className="text-xs text-muted-foreground">{parameter.description}</p>
							)}

							<Input
								placeholder={parameter.placeholder}
								value={paramValue?.value || ''}
								onChange={(e) => setParameterValue(parameter.id, e.target.value)}
								className={cn(hasError && 'border-red-500 focus:border-red-500')}
							/>

							{hasError && <p className="text-xs text-red-500">{hasError}</p>}
						</div>
					);
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
						Execute Command
					</Button>
				</div>
			</div>
		</div>
	);
}
