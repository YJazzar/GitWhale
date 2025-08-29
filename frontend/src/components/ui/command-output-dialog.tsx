import { CopyButton } from '@/components/ui/copy-button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal } from 'lucide-react';
import { command_utils } from 'wailsjs/go/models';
import { CommandDisplay } from './command-display';

interface CommandOutputDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	command: command_utils.CommandEntry;
	title?: string;
}

export function CommandOutputDialog({ open, onOpenChange, command }: CommandOutputDialogProps) {
	const commandOutput = command.output;
	const commandErrorOutput = command.errorOutput;

	// TODO PROMPT: in the output, replace all null terminators with new lines for easier reading (maybe add a UI toggle to turn that off as well)
	// Need to add styling to show a different color on the text that replaces the null terminator with some symbol as a new line to show that we did 
	// this replace as a post-processing step, and that i wasn't part of the original command

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
					<>
						{commandOutput && (
							<div className="flex flex-col flex-1 min-h-0">
								<div className="flex items-center justify-between mb-2 flex-shrink-0">
									<h4 className="text-sm font-medium">Standard Output</h4>
									<CopyButton text={commandOutput} title="Copy output" />
								</div>
								<div className="flex-1 border rounded-md overflow-hidden min-h-0">
									<ScrollArea className="h-full">
										<pre className="text-xs p-4 whitespace-pre-wrap break-all">
											{commandOutput}
										</pre>
									</ScrollArea>
								</div>
							</div>
						)}
						{commandErrorOutput && (
							<div className="flex flex-col flex-1 min-h-0">
								<div className="flex items-center justify-between mb-2 flex-shrink-0">
									<h4 className="text-sm font-medium text-red-600 dark:text-red-400">
										Error Output
									</h4>
									<CopyButton text={commandErrorOutput} title="Copy error output" />
								</div>
								<div className="flex-1 border border-red-200 dark:border-red-800 rounded-md overflow-hidden min-h-0">
									<ScrollArea className="h-full">
										<pre className="text-xs bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 p-4 whitespace-pre-wrap break-all">
											{commandErrorOutput}
										</pre>
									</ScrollArea>
								</div>
							</div>
						)}
					</>
				</div>
			</DialogContent>
		</Dialog>
	);
}
