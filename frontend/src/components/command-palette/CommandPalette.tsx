import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCommandPaletteState } from '@/hooks/command-palette/use-command-palette-state';
import { useCommandRegistry } from '@/hooks/command-palette/use-command-registry';
import { CommandIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { CommandInput } from './CommandInput';
import { CommandPaletteItem } from './CommandItem';

export function CommandPalette() {
	const commandPaletteState = useCommandPaletteState();
	const currentSearchQuery = commandPaletteState.searchQuery.get();
	const isActive = commandPaletteState.isActive;

	const registry = useCommandRegistry(currentSearchQuery);
	const searchResults = registry.matchedCommands;

	// Decides if we should show the empty state
	const showNowCommandsFound = searchResults.length == 0 && currentSearchQuery.length > 0;

	// Decides which list of commands to show
	const showAllAvailableCommands = currentSearchQuery.length == 0;
	const commandsToShow = showAllAvailableCommands ? registry.allAvailableCommands : searchResults;

	// Handle keyboard navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isActive.get()) return;

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					// selectNext(maxIndex);
					break;
				case 'ArrowUp':
					e.preventDefault();
					// selectPrevious();
					break;
				case 'Escape':
					e.preventDefault();
					commandPaletteState.isActive.set(false);
					break;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isActive.get(), isActive.set]);

	// Render different views based on execution state
	const renderContent = () => {
		return (
			<>
				{/* Search Input */}
				<div className="p-4 border-b">
					<CommandInput />
				</div>

				{/* Command List */}
				<ScrollArea className="flex-1">
					<div className="p-2">
						{showNowCommandsFound && (
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
										isSelected={true}
									/>
								))}
							</div>
						)}
					</div>
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
							{searchResults.length} command{searchResults.length !== 1 ? 's' : ''}
						</div>
					</div>
				</div>
			</>
		);
	};

	return (
		<Dialog open={isActive.get()} onOpenChange={isActive.set}>
			<DialogContent className="sm:max-w-[600px] p-0 gap-0 h-[400px] flex flex-col">
				{renderContent()}
			</DialogContent>
		</Dialog>
	);
}
