import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
	useCommandPaletteExecutor,
	useCommandPaletteSelectionManager,
	useCommandPaletteState,
} from '@/hooks/command-palette/use-command-palette-state';
import { CommandIcon } from 'lucide-react';
import { useEffect } from 'react';
import { CommandInput } from './CommandInput';
import { CommandPaletteItem } from './CommandItem';
import { EmptyState } from '../empty-state';

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
					{commandsToShow.map((command, index) => (
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
				title={()=>  <>Error: we got tricked into executing a command, but we don't know which one! </>}
				message={"I cAn'T BeLeIve YoU'vE DoNe ThIs"}
			/>
		);
	}

	const requestedHooks = inProgressCommand.action.requestedHooks()
	

	return <></>;
}
