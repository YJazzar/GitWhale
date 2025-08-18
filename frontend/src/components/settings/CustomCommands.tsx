import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { useCustomCommandsState } from '@/hooks/state/use-custom-commands-state';
import { useNavigateRootFilTabs } from '@/hooks/navigation/use-navigate-root-file-tabs';
import { Edit, Plus, Trash2, Terminal } from 'lucide-react';
import { useCallback } from 'react';
import { CommandPaletteContextKey } from '@/types/command-palette';

export function CustomCommands() {
	const { customCommands, isLoading, error, deleteCustomCommand } = useCustomCommandsState();
	const { onOpenCustomCommandEditor } = useNavigateRootFilTabs();

	const handleCreateNew = useCallback(() => {
		onOpenCustomCommandEditor();
	}, [onOpenCustomCommandEditor]);

	const handleEdit = useCallback(
		(commandId: string) => {
			onOpenCustomCommandEditor(commandId);
		},
		[onOpenCustomCommandEditor]
	);

	const handleDelete = useCallback(
		async (commandId: string) => {
			try {
				await deleteCustomCommand(commandId);
			} catch (err) {
				// Error is handled by the hook
				console.error('Failed to delete command:', err);
			}
		},
		[deleteCustomCommand]
	);

	const getContextLabel = (context: CommandPaletteContextKey) => {
		switch (context) {
			case CommandPaletteContextKey.Root:
				return 'Root';
			case CommandPaletteContextKey.Repo:
				return 'Repository';
			default:
				return context;
		}
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Terminal className="h-5 w-5" />
						Custom Commands
					</CardTitle>
					<CardDescription>Create and manage your custom commands</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="text-center text-muted-foreground py-8">Loading custom commands...</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Terminal className="h-5 w-5" />
					Custom Commands
				</CardTitle>
				<CardDescription>
					Create and manage your custom commands for the command palette
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{error && (
					<div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>
				)}

				<div className="flex justify-between items-center">
					<div className="text-sm text-muted-foreground">
						{customCommands.length} custom {customCommands.length === 1 ? 'command' : 'commands'}
					</div>
					<Button onClick={handleCreateNew} size="sm" className="select-none">
						<Plus className="h-4 w-4 mr-2" />
						Add Command
					</Button>
				</div>

				{customCommands.length === 0 ? (
					<div className="text-center py-8 text-muted-foreground">
						<Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
						<div className="text-sm font-medium">No custom commands yet</div>
						<div className="text-xs">Create your first custom command to get started</div>
					</div>
				) : (
					<div className="space-y-2">
						{customCommands.map((command) => (
							<div
								key={command.id}
								className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors select-none"
							>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<div className="font-medium truncate">{command.title}</div>
										<span className="text-xs px-2 py-0.5 bg-muted rounded-full">
											{getContextLabel(command.context)}
										</span>
									</div>
									{command.description && (
										<div className="text-sm text-muted-foreground truncate mt-1">
											{command.description}
										</div>
									)}
									<div className="text-xs text-muted-foreground mt-1">
										{command.action.commandString}
									</div>
								</div>
								<div className="flex items-center gap-1 ml-4">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleEdit(command.id)}
										className="h-8 w-8 p-0 select-none"
									>
										<Edit className="h-4 w-4" />
									</Button>
									<ConfirmDeleteButton
										onDelete={() => handleDelete(command.id)}
										size="sm"
										className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
									>
										<Trash2 className="h-4 w-4" />
									</ConfirmDeleteButton>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
