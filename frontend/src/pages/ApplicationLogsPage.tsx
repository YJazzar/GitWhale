import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { UseAppState } from '@/hooks/state/use-app-state';
import { LOG_LEVELS, LogLevel, useAppLogState } from '@/hooks/state/use-log-state';
import { useResizeObserver } from '@/hooks/use-resize-observer';
import { ChevronDown, Filter, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function ApplicationLogsPage() {
	const logState = useAppLogState();
	const { appState } = UseAppState();
	const terminalRef = useRef<HTMLDivElement>(null);
	const isInitialized = useRef(false);

	const { filterLevel } = logState;

	// Initialize terminal and load initial logs
	useEffect(() => {
		if (isInitialized.current || !terminalRef.current) {
			return;
		}

		const terminalSettings = appState?.appConfig?.settings?.terminal;
		const { element } = logState.createLogTerminal(terminalSettings);

		// Mount terminal to DOM
		if (terminalRef.current && element) {
			terminalRef.current.appendChild(element);
		}

		logState.fitTerminal();
		isInitialized.current = true;
	}, []);

	// Handle window resize to fit terminal
	useEffect(() => {
		const handleResize = () => {
			logState.fitTerminal();
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	useResizeObserver(terminalRef as unknown as React.MutableRefObject<null>, () => {
		logState.fitTerminal();
	});

	return (
		<div className="h-full flex flex-col">
			{/* Toolbar */}
			<div className="border-b bg-muted/20 p-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<span className="font-medium">Log Messages</span>
					</div>
					<div className="flex items-center gap-2">
						{/* Log Level Filter */}
						<>
							<Filter className="w-4 h-4 text-muted-foreground" />
							<span className="text-sm text-muted-foreground">Filter:</span>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="min-w-[100px] justify-between"
									>
										{filterLevel.get()}
										<ChevronDown className="w-3 h-3" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuLabel>Log Level</DropdownMenuLabel>
									<DropdownMenuSeparator />
									{LOG_LEVELS.map((level) => (
										<DropdownMenuItem
											key={level}
											onClick={() => filterLevel.set(level)}
											className="flex items-center justify-between"
										>
											{level}
											{filterLevel.get() === level && (
												<span className="text-xs">✓</span>
											)}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</>
						<Separator orientation="vertical" className="h-6 mx-2" />
						<Button
							onClick={logState.clearLogs}
							variant="outline"
							size="sm"
							title="Clear all logs"
						>
							<Trash2 className="w-3 h-3" />
						</Button>
					</div>
				</div>
			</div>

			{/* Terminal Container */}
			<div className="flex-1 min-h-0">
				<div ref={terminalRef} className="h-full w-full" style={{ minHeight: '400px' }} />
			</div>

			{/* Status Bar */}
			<div className="border-t bg-muted/10 px-4 py-2">
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<span>Filter: {logState.filterLevel.get()}</span>
					<span>{logState.isLoading ? 'Loading logs...' : 'Live logging active'}</span>
				</div>
			</div>
		</div>
	);
}
