import { useCommandPaletteExecutor } from "@/hooks/command-palette/use-command-palette-state";
import { cn } from "@/lib/utils";
import { CheckCircle, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { EmptyState } from "../empty-state";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

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

	const { allParameters, setParameterValue, getParameterValue } = commandExecutor.commandParameters;
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
