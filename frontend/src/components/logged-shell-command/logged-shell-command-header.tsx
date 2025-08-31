import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useLoggedShellCommandsState } from '@/hooks/state/use-logged-shell-commands-state';
import { ChevronDown, Filter, RefreshCw, Search, Trash2 } from 'lucide-react';

type FilterType = 'all' | 'running' | 'success' | 'failed';

const filterLabels: Record<FilterType, string> = {
	all: 'All Commands',
	running: 'Running',
	success: 'Success',
	failed: 'Failed',
};

export function LoggedShellCommandLogsHeader() {
	const { searchTerm, filter, lastRefresh, refreshCommands, isLoading, commands, clearAllCommands } =
		useLoggedShellCommandsState();

	return (
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
					<span className="text-xs font-medium">Auto-refresh 1s</span>
					{lastRefresh && (
						<span className="text-xs text-muted-foreground ml-1">
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
						value={searchTerm.value}
						onChange={(e) => searchTerm.set(e.target.value)}
						className="pl-7 h-7 text-xs w-32 sm:w-40"
					/>
				</div>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm" className="h-7 px-2 flex-shrink-0">
							<Filter className="w-3 h-3 mr-1" />
							<span className="text-xs">{filterLabels[filter.value]}</span>
							<ChevronDown className="w-3 h-3 ml-1" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuLabel className="text-xs">Filter by Status</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{(Object.keys(filterLabels) as FilterType[]).map((key) => (
							<DropdownMenuItem key={key} onClick={() => filter.set(key)} className="text-xs">
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
	);
}
