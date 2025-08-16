import { CommandDefinition } from '@/types/command-palette';
import clsx from 'clsx';
import { CommandIcon, Badge, ChevronRight } from 'lucide-react';

interface CommandPaletteItemProps {
	command: CommandDefinition
	isSelected: boolean;
}

export function CommandPaletteItem({ command, isSelected }: CommandPaletteItemProps) {
	return (
		<div
			className={clsx(
				'flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all',
				{
					'bg-accent text-accent-foreground': isSelected,
					'hover:bg-accent/50': !isSelected,
				}
			)}
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
					<p className="text-xs text-muted-foreground mt-1 truncate">{command.description}</p>
				)}
				{command.parameters && command.parameters.length > 0 && (
					<div className="flex items-center gap-1 mt-1">
						<span className="text-xs text-muted-foreground">Parameters:</span>
						{command.parameters.map((param: any) => (
							<Badge key={param.id} className="text-xs">
								{param.prompt}
							</Badge>
						))}
					</div>
				)}
			</div>

			{/* Arrow for selection */}
			{isSelected && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
		</div>
	);
}
