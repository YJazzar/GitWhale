
import { LoggedShellCommandCard } from '@/components/logged-shell-command/logged-shell-command-card';
import { LoggedShellCommandLogsHeader } from '@/components/logged-shell-command/logged-shell-command-header';
import { LoggedShellCommandStatistics } from '@/components/logged-shell-command/logged-shell-command-statistics';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLoggedShellCommandsState } from '@/hooks/state/use-logged-shell-commands-state';
import { Terminal } from 'lucide-react';
import { useMemo } from 'react';

export default function CommandLogsPage() {
	const {
		searchTerm,
		filter,
		commands,
	} = useLoggedShellCommandsState();

	const filteredCommands = useMemo(() => {
		let filtered = commands.all;

		// Apply status filter
		if (filter.value !== 'all') {
			switch (filter.value) {
				case 'running':
					filtered = commands.runningCommands;
					break;
				case 'success':
					filtered = commands.successCommands;
					break;
				case 'failed':
					filtered = commands.failedCommands;
					break;
			}
		}

		// Apply search filter
		if (searchTerm.value) {
			const term = searchTerm.value.toLowerCase();
			filtered = filtered.filter(
				(cmd) =>
					cmd.command.toLowerCase().includes(term) ||
					cmd.args?.some((arg) => arg.toLowerCase().includes(term)) ||
					cmd.fullCommand.toLowerCase().includes(term) ||
					cmd.workingDirectory.toLowerCase().includes(term) ||
					cmd.output.toLowerCase().includes(term) ||
					cmd.errorOutput.toLowerCase().includes(term)
			);
		}

		return filtered;
	}, [commands, filter, searchTerm]);

	return (
		<div className="h-full flex flex-col p-3">
			<LoggedShellCommandLogsHeader />

		<LoggedShellCommandStatistics/>


			{/* Commands List */}
			<div className="flex-1 min-h-0">
				{filteredCommands.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-muted-foreground">
						<Terminal className="w-8 h-8 mb-2" />
						<h3 className="text-sm font-medium mb-1">No commands found</h3>
						<p className="text-xs text-center max-w-sm">
							{commands.all.length === 0
								? 'No commands executed yet. Run operations to see them here.'
								: 'No commands match your filters. Try adjusting search or filter.'}
						</p>
					</div>
				) : (
					<ScrollArea className="h-full">
						<div className="space-y-0 pr-2">
							{filteredCommands.map((command) => (
								<LoggedShellCommandCard
									key={command.id}
									command={command}
								/>
							))}
						</div>
					</ScrollArea>
				)}
			</div>
		</div>
	);
}
