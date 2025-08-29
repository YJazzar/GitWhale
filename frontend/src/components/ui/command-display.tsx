import { CopyButton } from '@/components/ui/copy-button';
import { command_utils } from '../../../wailsjs/go/models';

interface CommandDisplayProps {
	command: command_utils.CommandEntry;
}

export function CommandDisplay({ command }: CommandDisplayProps) {
	return (
		<div className="space-y-1">
			<div className="bg-muted px-1.5 py-0.5 rounded min-w-0  flex items-center gap-2 ">
				<code className="text-xs font-mono flex-1 min-w-0 overflow-auto">{command.fullCommand}</code>
				<CopyButton
					text={command.fullCommand}
					title="Copy command"
					size="sm"
					className="h-4 w-4 p-3 flex-shrink-0 bg-background/80 hover:bg-background border border-border/50 hover:border-border shadow-sm"
				/>
			</div>
		</div>
	);
}
