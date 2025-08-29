import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useCommandLogsState } from '@/hooks/state/use-command-logs-state';
import {
	CheckCircle,
	ChevronDown,
	Clock,
	Eye,
	Filter,
	Loader2,
	RefreshCw,
	Search,
	Terminal,
	Trash2,
	XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { command_utils } from '../../wailsjs/go/models';

type FilterType = 'all' | 'running' | 'success' | 'failed';

const StatusBadge = ({ status }: { status: number }) => {
	switch (status) {
		case 0: // CommandRunning
			return (
				<Badge
					variant="secondary"
					className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs px-1.5 py-0 h-5"
				>
					<Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
					Run
				</Badge>
			);
		case 1: // CommandSuccess
			return (
				<Badge
					variant="secondary"
					className="bg-green-500/10 text-green-500 border-green-500/20 text-xs px-1.5 py-0 h-5"
				>
					<CheckCircle className="w-2.5 h-2.5 mr-0.5" />
					OK
				</Badge>
			);
		case 2: // CommandFailed
			return (
				<Badge
					variant="secondary"
					className="bg-red-500/10 text-red-500 border-red-500/20 text-xs px-1.5 py-0 h-5"
				>
					<XCircle className="w-2.5 h-2.5 mr-0.5" />
					Fail
				</Badge>
			);
		default:
			return (
				<Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
					?
				</Badge>
			);
	}
};

const CommandCard = ({
	command,
	formatDuration,
	formatTimeAgo,
}: {
	command: command_utils.CommandEntry;
	formatDuration: (ns: number) => string;
	formatTimeAgo: (date: string) => string;
}) => {
	const [dialogOpen, setDialogOpen] = useState(false);
	const hasOutput = !!(command.output || command.errorOutput);

	const handleDoubleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (hasOutput) {
			setDialogOpen(true);
		}
	};

	return (
		<>
			<Card className="mb-2 cursor-pointer" onClick={handleDoubleClick}>
				<CardHeader className="pb-1 pt-2 px-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<StatusBadge status={command.status} />
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
					</div>
					<div className="mt-1 min-w-0">
						<div className="bg-muted px-1.5 py-0.5 rounded min-w-0 flex items-center gap-2">
							<code className="text-xs font-mono flex-1 truncate min-w-0">
								{command.fullCommand}
							</code>
							<CopyButton
								text={command.fullCommand}
								title="Copy command"
								size="sm"
								className="h-4 w-4 p-4 flex-shrink-0 border border-border/50 hover:border-border shadow-sm"
							/>
						</div>
					</div>
					{command.workingDirectory && (
						<div className="text-xs text-muted-foreground mt-0.5 truncate min-w-0">
							<code className="text-xs break-all">{command.workingDirectory}</code>
						</div>
					)}
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
			{hasOutput && (
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogContent className="max-w-4xl h-[80vh] flex flex-col">
						<DialogHeader className="flex-shrink-0">
							<DialogTitle className="flex items-center gap-2">
								<Terminal className="w-4 h-4" />
								Command Output
							</DialogTitle>
							<DialogDescription className="text-xs font-mono bg-muted px-2 py-1 rounded truncate">
								{command.fullCommand}
							</DialogDescription>
						</DialogHeader>
						<div className="flex-1 min-h-0 space-y-4 overflow-hidden">
							{command.output && command.errorOutput ? (
								<>
									<div className="flex flex-col flex-1 min-h-0">
										<div className="flex items-center justify-between mb-2 flex-shrink-0">
											<h4 className="text-sm font-medium">Standard Output</h4>
											<CopyButton text={command.output} title="Copy output" />
										</div>
										<div className="flex-1 border rounded-md overflow-hidden min-h-0">
											<ScrollArea className="h-full">
												<pre className="text-xs p-4 whitespace-pre-wrap break-all">
													{command.output}
												</pre>
											</ScrollArea>
										</div>
									</div>
									<div className="flex flex-col flex-1 min-h-0">
										<div className="flex items-center justify-between mb-2 flex-shrink-0">
											<h4 className="text-sm font-medium text-red-600 dark:text-red-400">
												Error Output
											</h4>
											<CopyButton
												text={command.errorOutput}
												title="Copy error output"
											/>
										</div>
										<div className="flex-1 border border-red-200 dark:border-red-800 rounded-md overflow-hidden min-h-0">
											<ScrollArea className="h-full">
												<pre className="text-xs bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 p-4 whitespace-pre-wrap break-all">
													{command.errorOutput}
												</pre>
											</ScrollArea>
										</div>
									</div>
								</>
							) : command.output ? (
								<div className="flex flex-col h-full min-h-0">
									<div className="flex items-center justify-between mb-2 flex-shrink-0">
										<h4 className="text-sm font-medium">Standard Output</h4>
										<CopyButton text={command.output} title="Copy output" />
									</div>
									<div className="flex-1 border rounded-md overflow-hidden min-h-0">
										<ScrollArea className="h-full">
											<pre className="text-xs p-4 whitespace-pre-wrap break-all">
												{command.output}
											</pre>
										</ScrollArea>
									</div>
								</div>
							) : command.errorOutput ? (
								<div className="flex flex-col h-full min-h-0">
									<div className="flex items-center justify-between mb-2 flex-shrink-0">
										<h4 className="text-sm font-medium text-red-600 dark:text-red-400">
											Error Output
										</h4>
										<CopyButton text={command.errorOutput} title="Copy error output" />
									</div>
									<div className="flex-1 border border-red-200 dark:border-red-800 rounded-md overflow-hidden min-h-0">
										<ScrollArea className="h-full">
											<pre className="text-xs bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 p-4 whitespace-pre-wrap break-all">
												{command.errorOutput}
											</pre>
										</ScrollArea>
									</div>
								</div>
							) : null}
						</div>
					</DialogContent>
				</Dialog>
			)}
		</>
	);
};

export default function CommandLogsPage() {
	const {
		commands,
		statistics,
		isLoading,
		lastRefresh,
		refreshCommands,
		clearAllCommands,
		formatDuration,
		formatTimeAgo,
	} = useCommandLogsState();

	const [searchTerm, setSearchTerm] = useState('');
	const [filter, setFilter] = useState<FilterType>('all');

	const filteredCommands = useMemo(() => {
		let filtered = commands.all;

		// Apply status filter
		if (filter !== 'all') {
			switch (filter) {
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
		if (searchTerm) {
			const term = searchTerm.toLowerCase();
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

	const filterLabels = {
		all: 'All Commands',
		running: 'Running',
		success: 'Success',
		failed: 'Failed',
	};

	return (
		<div className="h-full flex flex-col p-3">
			{/* Header */}
			<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
				<div className="min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<h1 className="text-lg font-bold">Command Logs</h1>
						<p className="text-xs text-muted-foreground hidden sm:block">
							Monitor commands being run in the background
						</p>
					</div>
					<div className="flex items-center w-fit gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-md border border-green-500/20">
						<div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
						<span className="text-xs font-medium">Auto-refresh 2.5s</span>
						{lastRefresh && (
							<span className="text-xs text-muted-foreground ml-1 hidden md:inline">
								(last refreshed {lastRefresh.toLocaleTimeString()})
							</span>
						)}
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<div className="relative flex-shrink-0">
						<Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
						<Input
							placeholder="Search..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-7 h-7 text-xs w-32 sm:w-40"
						/>
					</div>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="h-7 px-2 flex-shrink-0">
								<Filter className="w-3 h-3 mr-1" />
								<span className="text-xs">{filterLabels[filter]}</span>
								<ChevronDown className="w-3 h-3 ml-1" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuLabel className="text-xs">Filter by Status</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{(Object.keys(filterLabels) as FilterType[]).map((key) => (
								<DropdownMenuItem
									key={key}
									onClick={() => setFilter(key)}
									className="text-xs"
								>
									{filterLabels[key]}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					<Button
						variant="outline"
						size="sm"
						className="h-7 px-2 flex-shrink-0"
						onClick={refreshCommands}
						disabled={isLoading}
					>
						<RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
						<span className="text-xs hidden sm:inline">Refresh</span>
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="h-7 px-2 flex-shrink-0"
						onClick={clearAllCommands}
						disabled={commands.all.length === 0}
					>
						<Trash2 className="w-3 h-3 mr-1" />
						<span className="text-xs hidden sm:inline">Clear</span>
					</Button>
				</div>
			</div>

			{/* Statistics - Responsive Layout */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-2 lg:gap-4 mb-3 px-3 py-2 bg-muted/30 rounded-lg overflow-x-auto">
				<div className="flex items-center gap-1 whitespace-nowrap">
					<span className="text-xs font-medium">Total:</span>
					<span className="text-sm font-bold">{statistics.total}</span>
				</div>
				<div className="flex items-center gap-1 whitespace-nowrap">
					<span className="text-xs font-medium">Running:</span>
					<span className="text-sm font-bold text-yellow-500">{statistics.running}</span>
				</div>
				<div className="flex items-center gap-1 whitespace-nowrap">
					<span className="text-xs font-medium">Success:</span>
					<span className="text-sm font-bold text-green-500">{statistics.success}</span>
				</div>
				<div className="flex items-center gap-1 whitespace-nowrap">
					<span className="text-xs font-medium">Failed:</span>
					<span className="text-sm font-bold text-red-500">{statistics.failed}</span>
				</div>
				<div className="flex items-center gap-1 whitespace-nowrap col-span-2 sm:col-span-1">
					<span className="text-xs font-medium">Success Rate:</span>
					<span className="text-sm font-bold">{statistics.successRate.toFixed(0)}%</span>
				</div>
			</div>

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
								<CommandCard
									key={command.id}
									command={command}
									formatDuration={formatDuration}
									formatTimeAgo={formatTimeAgo}
								/>
							))}
						</div>
					</ScrollArea>
				)}
			</div>
		</div>
	);
}
