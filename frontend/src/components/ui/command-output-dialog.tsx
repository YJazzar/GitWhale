import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Terminal } from 'lucide-react';
import { command_utils } from 'wailsjs/go/models';
import { CommandDisplay } from './command-display';
import { CommandOutputDisplay } from './command-output-display';

interface CommandOutputDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	command: command_utils.CommandEntry;
	title?: string;
}

export function CommandOutputDialog({ open, onOpenChange, command }: CommandOutputDialogProps) {
	const commandOutput = command.output;
	const commandErrorOutput = command.errorOutput;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl h-[80vh] flex flex-col">
				<DialogHeader className="flex-shrink-0">
					<DialogTitle className="flex items-center gap-2">
						<Terminal className="w-4 h-4" />
						Command Output
					</DialogTitle>
					<DialogDescription className="text-xs font-mono bg-muted px-2 py-1 m-2 rounded truncate">
						<CommandDisplay command={command} />
					</DialogDescription>
				</DialogHeader>
				<div className="flex-1 min-h-0 space-y-4 overflow-auto">
					{commandOutput && (
						<CommandOutputDisplay
							title="Standard Output"
							output={commandOutput}
							outputType="stdout"
						/>
					)}
					{commandErrorOutput && (
						<CommandOutputDisplay
							title="Error Output"
							output={commandErrorOutput}
							outputType="stderr"
						/>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
