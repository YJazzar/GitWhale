import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
	useCommandPaletteSelectionManager,
	useCommandPaletteState
} from '@/hooks/command-palette/use-command-palette-state';
import { CommandInput } from './CommandInput';
import { CommandPaletteExecutor } from './CommandPaletteExecutor';
import { CommandPaletteSearch } from './CommandPaletteSearch';

export function CommandPalette() {
	const commandPaletteState = useCommandPaletteState();
	const selectionManager = useCommandPaletteSelectionManager(true);

	// Helpful aliases
	const isActive = commandPaletteState.isActive;
	const onChangeSelectionFromArrow = selectionManager.onChangeSelectionFromArrow;
	const commandsToShow = selectionManager.commandsToShow;

	const isSearchingForCommand = commandPaletteState.currentState === 'searchingForCommand';
	const isExecutingCommand = commandPaletteState.currentState === 'executingCommand';

	return (
		<Dialog open={isActive.get()} onOpenChange={isActive.set} modal>
			<DialogContent
				hideCloseIcon
				className="sm:max-w-[600px] p-0 gap-0 h-[400px] flex flex-col"
				onEscapeKeyDown={(e) => {
					e.preventDefault();
				}}
			>
				{/* UI to show when the user has not chosen a command yet */}
				{isSearchingForCommand && (
					<>
						{/* Search Input */}
						<div className="p-4 border-b">
							<CommandInput />
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

