import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
	useCommandPaletteSelectionManager,
	useCommandPaletteState,
} from '@/hooks/command-palette/use-command-palette-state';
import { DialogTitle } from '@radix-ui/react-dialog';
import { CommandPaletteExecutor } from './CommandPaletteExecutor';
import { CommandPaletteInput } from './CommandPaletteInput';
import { CommandPaletteSearch } from './CommandPaletteSearch';
import { CommandPaletteMinimizedWidget } from './CommandPaletteMinimizedWidget';

export function CommandPalette() {
	const commandPaletteState = useCommandPaletteState();
	const selectionManager = useCommandPaletteSelectionManager(true);

	// Helpful aliases
	const dialogVisualState = commandPaletteState.dialogVisualState;
	const commandsToShow = selectionManager.commandsToShow;

	const isSearchingForCommand = commandPaletteState.currentState === 'searchingForCommand';
	const isExecutingCommand = commandPaletteState.currentState === 'executingCommand';

	const onDialogOpenChange = (newValue: boolean) => {
		dialogVisualState.set(newValue ? 'opened' : 'closed');
	};

	// Show dialog content when opened, and the widget when minimized
	const showDialogContent = dialogVisualState.get() === 'opened';
	const showMinimizedWidget = dialogVisualState.get() === 'minimized';

	return (
		<>
			{/* Main Dialog - hidden when minimized but keeps components mounted */}
			<Dialog open={showDialogContent} onOpenChange={onDialogOpenChange} modal>
				<DialogTitle></DialogTitle>
				<DialogContent
					hideCloseIcon
					className="sm:max-w-[800px] p-0 gap-0 h-[500px] flex flex-col"
					onEscapeKeyDown={(e) => {
						e.preventDefault();
					}}
				>
					{/* UI to show when the user has not chosen a command yet */}
					{isSearchingForCommand && (
						<>
							{/* Search Input */}
							<div className="p-2 border-b">
								<CommandPaletteInput />
							</div>

							{/* Command List */}
							<ScrollArea className="flex-1">
								<CommandPaletteSearch />
							</ScrollArea>
						</>
					)}

					{/* UI to show when we're in the process of executing a specific command */}
					{isExecutingCommand && (
						<>
							<ScrollArea className="flex-1">
								<CommandPaletteExecutor />
							</ScrollArea>
						</>
					)}

					{/* Footer */}
					<div className="p-3 border-t bg-muted/30">
						{isSearchingForCommand && <CommandPaletteSearchFooter />}
						{isExecutingCommand && <CommandPaletteExecutorFooter />}
					</div>
				</DialogContent>
			</Dialog>

			{/* Minimized Widget */}
			{showMinimizedWidget && <CommandPaletteMinimizedWidget />}

			{/* Hidden container to keep hooks running when minimized */}
			{showMinimizedWidget && (
				<div className="fixed -top-[9999px] -left-[9999px] opacity-0 pointer-events-none">
					{/* Keep the executor running even when minimized */}
					{isExecutingCommand && <CommandPaletteExecutor />}
				</div>
			)}
		</>
	);
}

function CommandPaletteSearchFooter() {
	const selectionManager = useCommandPaletteSelectionManager(false);
	const commandsToShow = selectionManager.commandsToShow;

	return (
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
	);
}

function CommandPaletteExecutorFooter() {
	return (
		<div className="flex items-center justify-between text-xs text-muted-foreground">
			<div className="flex items-center gap-4">
				<span>
					<kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl + P</kbd> to minimize/close
				</span>
			</div>
			<div>
				<span>
					<kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl + Enter</kbd> to execute
				</span>
			</div>
		</div>
	);
}
