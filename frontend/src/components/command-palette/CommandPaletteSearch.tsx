import {
	useCommandPaletteState,
	useCommandPaletteSelectionManager,
} from '@/hooks/command-palette/use-command-palette-state';
import { CommandIcon } from 'lucide-react';
import { useEffect } from 'react';
import { CommandPaletteItem } from './CommandPaletteItem';

export function CommandPaletteSearch() {
	const { dialogVisualState, invokeCommand } = useCommandPaletteState();
	const selectionManager = useCommandPaletteSelectionManager(false);

	const commandsToShow = selectionManager.commandsToShow;
	const onChangeSelectionFromArrow = selectionManager.onChangeSelectionFromArrow;

	// Handle keyboard navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (dialogVisualState.get() !== 'opened') {
				return;
			}

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
					dialogVisualState.set('closed');
					break;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [dialogVisualState.get(), dialogVisualState.set, onChangeSelectionFromArrow]);

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
				<div className="space-y-1 select-none">
					{commandsToShow.map((command) => (
						<CommandPaletteItem
							key={command.id}
							command={command}
							isSelected={selectionManager.selectedCommand?.id === command.id}
							onSelect={() => {
								selectionManager.onSelectCommand(command.id);
							}}
							onExecute={() => {
								invokeCommand(command);
							}}
						/>
					))}
				</div>
			)}
		</div>
	);
}
