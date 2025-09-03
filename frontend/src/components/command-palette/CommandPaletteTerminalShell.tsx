import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	useCommandPaletteExecutor,
	useCommandPaletteState,
} from '@/hooks/command-palette/use-command-palette-state';
import {
	AlertCircle,
	CheckCircle,
	Clock,
	Minimize2,
	Square,
	StopCircle,
	Terminal,
	XCircle,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { ShellCommand } from '../shell-command';

export function CommandPaletteTerminalShell() {
	const commandPaletteExecutor = useCommandPaletteExecutor();
	const commandPaletteState = useCommandPaletteState();
	const {
		commandArgs,
		commandWorkingDir,
		status,
		terminalOutput,
		activeTopic,
		commandDuration,
		error,
		exitCode,
		cancelTerminalCommand,
	} = commandPaletteExecutor.terminalCommandState;

	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const bottomRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom when new output arrives
	useEffect(() => {
		if (bottomRef.current) {
			bottomRef.current.scrollIntoView({ behavior: 'smooth' });
		}
	}, [terminalOutput]);

	const getStatusIcon = () => {
		switch (status) {
			case 'notStarted':
				return <Terminal className="h-4 w-4 text-muted-foreground" />;
			case 'started':
				return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
			case 'completed':
				return <CheckCircle className="h-4 w-4 text-green-500" />;
			case 'cancelled':
				return <StopCircle className="h-4 w-4 text-orange-500" />;
			case 'error':
				return <XCircle className="h-4 w-4 text-red-500" />;
			default:
				return <AlertCircle className="h-4 w-4 text-yellow-500" />;
		}
	};

	const getStatusBadge = () => {
		switch (status) {
			case 'notStarted':
				return <Badge variant="secondary">Ready</Badge>;
			case 'started':
				return (
					<Badge variant="default" className="bg-blue-500">
						Running
					</Badge>
				);
			case 'completed':
				return (
					<Badge variant="default" className="bg-green-500">
						Completed
					</Badge>
				);
			case 'cancelled':
				return (
					<Badge variant="default" className="bg-orange-500">
						Cancelled
					</Badge>
				);
			case 'error':
				return <Badge variant="destructive">Error</Badge>;
			default:
				return <Badge variant="outline">{status}</Badge>;
		}
	};

	const handleCancel = () => {
		cancelTerminalCommand();
	};

	const handleMinimize = () => {
		commandPaletteState.dialogVisualState.set('minimized');
	};

	const isRunning = status === 'started';
	const hasOutput = terminalOutput && terminalOutput.length > 0;
	const isComplete = status === 'completed' || status === 'error' || status === 'cancelled';

	return (
		<div className="flex flex-col h-full p-4">
			{/* Header with status */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					{getStatusIcon()}
					<span className="text-sm font-medium">Terminal Command</span>
					{getStatusBadge()}
				</div>

				<div className="flex items-center gap-1">
					{/* Show minimize button only during command execution */}
					{(isRunning || isComplete) && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleMinimize}
							className="h-7 w-7 p-0 hover:bg-muted"
							title="Minimize"
						>
							<Minimize2 className="h-3 w-3" />
						</Button>
					)}

					{isRunning && (
						<Button variant="outline" size="sm" onClick={handleCancel} className="h-7">
							<Square className="h-3 w-3 mr-1" />
							Cancel
						</Button>
					)}
				</div>
			</div>

			{/* Command Information */}
			{(commandArgs || commandWorkingDir) && (
				<div className='pb-3'>
					{commandArgs && (
						<ShellCommand commandString={commandArgs} truncateCommand expandOnClick showTerminalIcon includeCopyButton />
					)}
					{commandWorkingDir && (
						<div className="flex items-center text-xs gap-1">
							<span className="font-medium text-muted-foreground">Directory:</span>
							<code className="bg-background py-0.5 rounded text-muted-foreground font-mono">
								{commandWorkingDir}
							</code>
						</div>
					)}
				</div>
			)}

			{/* Terminal output */}
			<div className="flex-1 border rounded-md bg-black/95 text-green-400 font-mono text-[10px] min-w-0 max-w-full">
				<div ref={scrollAreaRef} className="h-full w-full overflow-auto max-w-full">
					<div className="p-2 w-fit min-w-full">
						{hasOutput ? (
							<pre className="whitespace-pre leading-tight w-fit">{terminalOutput}</pre>
						) : (
							<div className="text-muted-foreground/60 italic text-xs">
								{status === 'notStarted'
									? 'No command output yet...'
									: status === 'started'
									? 'Command running - waiting for output...'
									: status === 'cancelled'
									? 'Command was cancelled'
									: 'No output recorded'}
							</div>
						)}
						<div ref={bottomRef} />
					</div>
				</div>
			</div>

			{/* Footer with status information */}
			<div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
				<div className="flex items-center gap-4">
					{exitCode !== undefined && (
						<div className="flex items-center gap-1">
							<Terminal className="h-3 w-3" />
							Exit Code: {exitCode}
						</div>
					)}
				</div>

				{activeTopic && (
					<div className="text-xs text-muted-foreground/60">
						Topic: {activeTopic.split('-').pop()}
					</div>
				)}
			</div>

			{/* Error display */}
			{error && (
				<div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
					<div className="flex items-center gap-2 text-destructive text-sm">
						<XCircle className="h-4 w-4" />
						<span className="font-medium">Error:</span>
					</div>
					<p className="text-sm text-destructive/80 mt-1">{error}</p>
				</div>
			)}

			{/* Completion message */}
			{isComplete && !error && status !== 'cancelled' && (
				<div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded-md">
					<div className="flex items-center gap-2 text-green-600 text-sm">
						<CheckCircle className="h-4 w-4" />
						<span>Command completed successfully</span>
						{commandDuration && (
							<span className="text-muted-foreground">in {commandDuration}</span>
						)}
					</div>
					<p className="text-xs text-muted-foreground mt-1">Press Escape to close this dialog</p>
				</div>
			)}

			{/* Cancellation message */}
			{status === 'cancelled' && (
				<div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-md">
					<div className="flex items-center gap-2 text-orange-600 text-sm">
						<StopCircle className="h-4 w-4" />
						<span>Command was cancelled</span>
						{commandDuration && (
							<span className="text-muted-foreground">after {commandDuration}</span>
						)}
					</div>
					<p className="text-xs text-muted-foreground mt-1">Press Escape to close this dialog</p>
				</div>
			)}
		</div>
	);
}
