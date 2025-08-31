import clsx from 'clsx';
import { CopyButton } from './ui/copy-button';
import { Terminal } from 'lucide-react';
import { useCallback, useState } from 'react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';

export interface ShellCommandLineProps {
	commandString: string;
	showTerminalIcon?: boolean;
	includeCopyButton?: boolean;
	truncateCommand?: boolean;
	expandOnClick?: boolean;
}

export function ShellCommand(props: ShellCommandLineProps) {
	const { commandString, showTerminalIcon, includeCopyButton, truncateCommand, expandOnClick } = props;
	const [isExpanded, setIsExpanded] = useState(false);

	const toggleOnExpand = useCallback(() => {
		if (expandOnClick !== true) {
			return;
		}

		setIsExpanded((prev) => !prev);
	}, [setIsExpanded]);

	const shouldTruncate = (truncateCommand || expandOnClick) && !isExpanded;

	return (
		<div className="bg-muted rounded flex items-center gap-1 w-full px-1.5">
			{showTerminalIcon && <Terminal className="h-4 w-4 shrink" />}
			<ScrollArea className="w-1 flex-1  py-0.5 ">
				<div className="flex items-center">
					<code
						className={clsx('text-xs select-auto max-w-full overflow-auto p-1', {
							truncate: shouldTruncate,
							'overflow-auto': !shouldTruncate,
						})}
						onClick={toggleOnExpand}
					>
						{commandString}
					</code>
				</div>
				<ScrollBar orientation="horizontal" />
			</ScrollArea>
			{includeCopyButton && (
				<CopyButton
					text={commandString}
					title="Copy command"
					size="sm"
					className="h-4 w-4 p-3 flex-shrink-0 bg-background/80 hover:bg-background border border-border/50 hover:border-border shadow-sm"
				/>
			)}
		</div>
	);
}
