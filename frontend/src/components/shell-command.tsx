import clsx from 'clsx';
import { CopyButton } from './ui/copy-button';
import { Terminal } from 'lucide-react';

export interface ShellCommandLineProps {
	commandString: string;
	showTerminalIcon?: boolean;
	includeCopyButton?: boolean;
	truncateCommand?: boolean;
}

export function ShellCommand(props: ShellCommandLineProps) {
	const { commandString, showTerminalIcon, includeCopyButton, truncateCommand } = props;

	return (
		<div className="bg-muted px-1.5 py-0.5 rounded min-w-0 flex items-center gap-2 w-full">
			{showTerminalIcon && <Terminal className="h-4 w-4 shrink" />}
			<code
				className={clsx('text-xs select-auto w-full', {
					truncate: truncateCommand,
					'overflow-auto': !truncateCommand,
				})}
			>
				{commandString}
			</code>

			{includeCopyButton && (
				<CopyButton
					text={commandString}
					title="Copy command"
					size="sm"
					className="h-4 w-4 p-2 flex-shrink-0 bg-background/80 hover:bg-background border border-border/50 hover:border-border shadow-sm"
				/>
			)}
		</div>
	);
}
