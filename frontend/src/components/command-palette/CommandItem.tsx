import { CommandDefinition } from '@/types/command-palette';
import clsx from 'clsx';
import { CommandIcon, ChevronRight } from 'lucide-react';

interface CommandPaletteItemProps {
	command: CommandDefinition<unknown>;
	isSelected: boolean;
}

export function CommandPaletteItem({ command, isSelected }: CommandPaletteItemProps) {
	return (
		<div
			className={clsx('flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer', {
				'bg-accent text-accent-foreground': isSelected,
				'hover:bg-accent/50': !isSelected,
			})}
		>
			{/* Icon */}
			<div className="flex-shrink-0 text-muted-foreground">
				{command.icon || <CommandIcon className="h-4 w-4" />}
			</div>

			{/* Content */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between">
					<h4 className="text-sm font-medium truncate">{command.title}</h4>
				</div>
				{command.description && (
					<p className="text-xs text-muted-foreground truncate">{command.description}</p>
				)}
			</div>

			{/* Arrow for selection */}
			{isSelected && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
		</div>
	);
}
