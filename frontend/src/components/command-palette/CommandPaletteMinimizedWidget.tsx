import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useCommandPaletteExecutor, useCommandPaletteState } from '@/hooks/command-palette/use-command-palette-state';
import { Terminal, Maximize2, Square, CheckCircle, XCircle, StopCircle } from 'lucide-react';
import { useMemo } from 'react';

export function CommandPaletteMinimizedWidget() {
	const commandPaletteState = useCommandPaletteState();
	const executorState = useCommandPaletteExecutor();

	const { status, cancelTerminalCommand } = executorState.terminalCommandState;
	const inProgressCommand = executorState._inProgressCommand.value;

	const handleRestore = () => {
		commandPaletteState.dialogVisualState.set('opened');
	};

	const handleCancel = () => {
		cancelTerminalCommand();
	};

	const getStatusInfo = useMemo(() => {
		switch (status) {
			case 'started':
				return {
					icon: <Terminal className="h-4 w-4 text-blue-500 animate-pulse" />,
					text: 'Running...',
					color: 'text-blue-600 dark:text-blue-400',
					bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
					showCancel: true,
				};
			case 'completed':
				return {
					icon: <CheckCircle className="h-4 w-4 text-green-500" />,
					text: 'Completed',
					color: 'text-green-600 dark:text-green-400',
					bgColor: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
					showCancel: false,
				};
			case 'cancelled':
				return {
					icon: <StopCircle className="h-4 w-4 text-orange-500" />,
					text: 'Cancelled',
					color: 'text-orange-600 dark:text-orange-400',
					bgColor: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
					showCancel: false,
				};
			case 'error':
				return {
					icon: <XCircle className="h-4 w-4 text-red-500" />,
					text: 'Error',
					color: 'text-red-600 dark:text-red-400',
					bgColor: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
					showCancel: false,
				};
			default:
				return {
					icon: <Terminal className="h-4 w-4 text-muted-foreground" />,
					text: 'Ready',
					color: 'text-muted-foreground',
					bgColor: 'bg-card border-border',
					showCancel: false,
				};
		}
	}, [status]);

	const commandTitle = inProgressCommand?.title || 'Command';
	const isRunning = status === 'started';

	return (
		<div className={`fixed bottom-4 right-4 z-50 transition-all duration-200 ${getStatusInfo.bgColor} border rounded-lg shadow-lg backdrop-blur-xs`}>
			<div className="flex items-center gap-3 p-3 pr-2">
				{/* Status and Command Info */}
				<div className="flex items-center gap-2 min-w-0 flex-1">
					{getStatusInfo.icon}
					<div className="min-w-0 flex-1">
						<div className="text-sm font-medium text-foreground truncate" title={commandTitle}>
							{commandTitle}
						</div>
						<div className={`text-xs ${getStatusInfo.color}`}>
							{getStatusInfo.text}
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex items-center gap-1 shrink-0">
					{getStatusInfo.showCancel && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleCancel}
							className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
							title="Cancel command"
						>
							<Square className="h-3 w-3" />
						</Button>
					)}
					<Button
						variant="ghost"
						size="sm"
						onClick={handleRestore}
						className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
						title="Restore command palette"
					>
						<Maximize2 className="h-3 w-3" />
					</Button>
				</div>
			</div>
		</div>
	);
}