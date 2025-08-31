import { command_utils } from '../../../wailsjs/go/models';
import { ShellCommand } from '../shell-command';

interface CommandDisplayProps {
	command: command_utils.CommandEntry;
}

export function LoggedShellCommandDisplay({ command }: CommandDisplayProps) {
	return (
		<div className="space-y-1">
			<ShellCommand commandString={command.fullCommand} includeCopyButton />
		</div>
	);
}
