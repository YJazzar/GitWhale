import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Trash2, Download, Filter, ChevronDown, Terminal, RefreshCw } from 'lucide-react';
import { useAppLogState, LogEntry, LOG_LEVELS } from '@/hooks/state/use-log-state';
import { GetApplicationLogHistory, ClearApplicationLogHistory } from '../../wailsjs/go/backend/App';
import { EventsOff, EventsOn } from '../../wailsjs/runtime/runtime';
import { UseAppState } from '@/hooks/state/use-app-state';

export default function ApplicationLogsPage() {
	const logState = useAppLogState();
	const { appState } = UseAppState();
	const [loading, setLoading] = useState(false);
	const [logFilter, setLogFilter] = useState('ALL');
	const terminalRef = useRef<HTMLDivElement>(null);
	const isInitialized = useRef(false);

	// Initialize terminal and load initial logs
	useEffect(() => {
		if (isInitialized.current || !terminalRef.current) return;

		// Get terminal settings from app state
		const terminalSettings = appState?.appConfig?.settings?.terminal;

		// Create the log terminal
		const { element } = logState.createLogTerminal(terminalSettings);

		// Mount terminal to DOM
		if (terminalRef.current && element) {
			terminalRef.current.appendChild(element);
		}

		// Load initial log history
		loadInitialLogs();

		// Subscribe to new log events
		EventsOn('log:entry', handleNewLogEntry);

		isInitialized.current = true;

		// Cleanup on unmount
		return () => {
			EventsOff('log:entry');
			// Don't dispose terminal to maintain persistence
		};
	}, [appState, terminalRef.current]);

	// Handle window resize to fit terminal
	useEffect(() => {
		const handleResize = () => {
			logState.fitTerminal();
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Fit terminal when component mounts
	useEffect(() => {
		const timer = setTimeout(() => {
			logState.fitTerminal();
		}, 100);

		return () => clearTimeout(timer);
	}, []);

	const loadInitialLogs = async () => {
		setLoading(true);
		try {
			const entries = await GetApplicationLogHistory();
			entries.forEach((entry: LogEntry) => {
				if (shouldShowLogEntry(entry)) {
					logState.appendLogEntry(entry);
				}
			});
		} catch (error) {
			console.error('Failed to load log history:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleNewLogEntry = (entry: LogEntry) => {
		if (shouldShowLogEntry(entry)) {
			logState.appendLogEntry(entry);
		}
	};

	const shouldShowLogEntry = (entry: LogEntry): boolean => {
		if (logFilter === 'ALL') return true;
		return entry.level === logFilter;
	};

	const handleClearLogs = async () => {
		try {
			await ClearApplicationLogHistory();
			logState.clearLogs();
		} catch (error) {
			console.error('Failed to clear logs:', error);
		}
	};

	const handleRefreshLogs = async () => {
		logState.clearLogs();
		await loadInitialLogs();
	};

	const handleExportLogs = async () => {
		try {
			const entries = await GetApplicationLogHistory();
			const logContent = entries
				.map((entry: LogEntry) => {
					const timestamp = new Date(entry.timestamp).toISOString();
					return `[${timestamp}] ${entry.level.padEnd(7)} ${entry.message}`;
				})
				.join('\n');

			const blob = new Blob([logContent], { type: 'text/plain' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `gitwhale-logs-${new Date().toISOString().split('T')[0]}.txt`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Failed to export logs:', error);
		}
	};

	const handleLogFilterChange = async (newFilter: string) => {
		setLogFilter(newFilter);

		// Reload logs with new filter
		logState.clearLogs();
		const entries = await GetApplicationLogHistory();
		entries.forEach((entry: LogEntry) => {
			if (newFilter === 'ALL' || entry.level === newFilter) {
				logState.appendLogEntry(entry);
			}
		});
	};

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
										{logFilter}
										<ChevronDown className="w-3 h-3" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuLabel>Log Level</DropdownMenuLabel>
									<DropdownMenuSeparator />
									{LOG_LEVELS.map((level) => (
										<DropdownMenuItem
											key={level}
											onClick={() => handleLogFilterChange(level)}
											className="flex items-center justify-between"
										>
											{level}
											{logFilter === level && <span className="text-xs">✓</span>}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</>
						<Separator orientation="vertical" className="h-6 mx-2" />
						<Button
							onClick={handleRefreshLogs}
							variant="outline"
							size="sm"
							disabled={loading}
							title="Refresh logs"
						>
							<RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
						</Button>
						<Button
							onClick={handleExportLogs}
							variant="outline"
							size="sm"
							title="Export logs to file"
						>
							<Download className="w-3 h-3" />
						</Button>
						<Button onClick={handleClearLogs} variant="outline" size="sm" title="Clear all logs">
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
					<span>Filter: {logFilter}</span>
					<span>{loading ? 'Loading logs...' : 'Live logging active'}</span>
				</div>
			</div>
		</div>
	);
}
