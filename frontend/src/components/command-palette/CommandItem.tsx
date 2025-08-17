import { CommandDefinition } from '@/types/command-palette';
import clsx from 'clsx';
import { CommandIcon, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface CommandPaletteItemProps {
	command: CommandDefinition<unknown>;
	isSelected: boolean;
}

export function CommandPaletteItem({ command, isSelected }: CommandPaletteItemProps) {
	const hasDescription = command.description && command.description.length > 0;
	const titleAndDescription = hasDescription ? `${command.title} - ${command.description}` : command.title;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div
						className={clsx('flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer', {
							'bg-accent text-accent-foreground': isSelected,
							'hover:bg-accent/50': !isSelected,
						})}
					>
						{/* Icon */}
						<div className="flex-shrink-0 text-muted-foreground">
							{command.icon || <CommandIcon className="h-3.5 w-3.5" />}
						</div>

						{/* Content */}
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<span className="text-sm font-medium">{command.title}</span>
								{hasDescription && (
									<span className="text-xs text-muted-foreground truncate">
										{command.description}
									</span>
								)}
							</div>
						</div>

						{/* Arrow for selection */}
						{isSelected && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
					</div>
				</TooltipTrigger>
				<TooltipContent side="bottom" className="max-w-full">
					<p>{titleAndDescription}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
