import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useLoggedShellCommandsState } from '@/hooks/state/use-logged-shell-commands-state';
import clsx from 'clsx';
import { Clock, Eye, Terminal } from 'lucide-react';
import { useState } from 'react';
import { command_utils } from '../../../wailsjs/go/models';
import { LoggedShellCommandDisplay } from './logged-shell-command-display';
import { LoggedShellCommandOutputDialog } from './logged-shell-command-output-dialog';
import { LoggedShellCommandStatusBadge } from './logged-shell-command-status-badge';

interface CommandCardProps {
	command: command_utils.CommandEntry;
}

export function LoggedShellCommandCard({ command }: CommandCardProps) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const hasOutput = !!(command.output || command.errorOutput);

	const { formatDuration, formatTimeAgo } = useLoggedShellCommandsState();

	const onOpenDialog = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (hasOutput) {
			setDialogOpen(true);
		}
	};

	return (
		<>
			<Card className="mb-2 cursor-pointer" onClick={onOpenDialog}>
				<CardHeader className="pb-1 pt-2 px-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<LoggedShellCommandStatusBadge status={command.status} size="sm" />
							{hasOutput && (
								<Button
									variant="ghost"
									size="sm"
									className="h-6 px-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
								>
									<Eye className="w-3 h-3 mr-1" />
									<span className="text-xs">Output</span>
								</Button>
							)}

							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<Clock className="w-2.5 h-2.5" />
								{formatTimeAgo(command.startTime)}
							</div>
							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<Terminal className="w-2.5 h-2.5" />
								{formatDuration(command.duration)}
							</div>
						</div>
						{command.workingDirectory && (
							<code className={clsx('text-xs text-muted-foreground select-auto w-fit')}>
								{command.workingDirectory}
							</code>
						)}
					</div>
					<LoggedShellCommandDisplay command={command} />
				</CardHeader>

				<CardContent className="pt-0 px-3 pb-2">
					<Separator className="mb-2" />

					<div className="space-y-2">
						<div className="grid grid-cols-4 gap-2 text-xs">
							<div>
								<span className="font-medium">Exit:</span>
								<span className="ml-1">{command.exitCode ?? 'N/A'}</span>
							</div>
							<div>
								<span className="font-medium">Started:</span>
								<span className="ml-1 text-xs">
									{new Date(command.startTime).toLocaleTimeString()}
								</span>
							</div>
							<div>
								<span className="font-medium">Ended:</span>
								<span className="ml-1 text-xs">
									{command.endTime
										? new Date(command.endTime).toLocaleTimeString()
										: 'Running'}
								</span>
							</div>
							<div>
								<span className="font-medium">ID:</span>
								<code className="ml-1 text-xs bg-muted px-1 py-0.5 rounded">
									{command.id.slice(0, 8)}...
								</code>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<LoggedShellCommandOutputDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				command={command}
			/>
		</>
	);
}
