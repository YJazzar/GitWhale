import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Terminal } from 'lucide-react';
import { command_utils } from 'wailsjs/go/models';
import { ShellCommand } from '../shell-command';
import { LoggedShellCommandOutputDisplay } from './logged-shell-command-output-display';

interface CommandOutputDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	command: command_utils.CommandEntry;
	title?: string;
}

export function LoggedShellCommandOutputDialog({ open, onOpenChange, command }: CommandOutputDialogProps) {
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
				</DialogHeader>
				<div className="flex-1 min-h-0 space-y-4 overflow-auto">
					<ShellCommand commandString={command.fullCommand} includeCopyButton expandOnClick />
					{commandOutput && (
						<LoggedShellCommandOutputDisplay
							title="Standard Output"
							output={commandOutput}
							outputType="stdout"
						/>
					)}
					{commandErrorOutput && (
						<LoggedShellCommandOutputDisplay
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
