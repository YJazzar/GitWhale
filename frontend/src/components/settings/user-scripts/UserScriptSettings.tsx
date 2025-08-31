import { UserScriptImportDialog } from '@/components/settings/user-scripts/UserScriptImportDialog';
import { ShellCommand } from '@/components/shell-command';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { useNavigateRootFilTabs } from '@/hooks/navigation/use-navigate-root-file-tabs';
import { useUserScriptCommandsState } from '@/hooks/state/use-user-script-commands-state';
import Logger from '@/utils/logger';
import { Download, Edit, Plus, Terminal, Trash2, Upload } from 'lucide-react';
import { useCallback, useState } from 'react';
import { SelectUserScriptFileForImport } from '../../../../wailsjs/go/backend/App';
import { UserScriptExportDialog } from './UserScriptExportDialog';

export function UserScriptSettings() {
	const { userScriptCommands, isLoading, error, deleteUserScriptCommand } = useUserScriptCommandsState();
	const { onOpenUserScriptCommandEditor } = useNavigateRootFilTabs();
	const [importingFile, setImportingFile] = useState<string | undefined>(undefined);
	const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

	const onCloseImportDialog = useCallback(() => {
		setImportingFile(undefined);
	}, [setImportingFile]);

	const handleCreateNew = useCallback(() => {
		onOpenUserScriptCommandEditor();
	}, [onOpenUserScriptCommandEditor]);

	const handleEdit = useCallback(
		(commandId: string) => {
			onOpenUserScriptCommandEditor(commandId);
		},
		[onOpenUserScriptCommandEditor]
	);

	const handleDelete = useCallback(
		async (commandId: string) => {
			try {
				await deleteUserScriptCommand(commandId);
			} catch (err) {
				// Error is handled by the hook
				Logger.error(`Failed to delete command: ${err}`);
			}
		},
		[deleteUserScriptCommand]
	);

	const onImportClicked = useCallback(async () => {
		// Open file dialog
		const filePath = await SelectUserScriptFileForImport();
		if (!filePath || filePath === '') {
			return;
		}

		setImportingFile(filePath);
	}, []);

	const onExportClicked = useCallback(() => {
		setIsExportDialogOpen(true);
	}, [setIsExportDialogOpen]);

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Terminal className="h-5 w-5" />
								User Scripts
							</CardTitle>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="text-center text-muted-foreground py-8">Loading user scripts...</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Terminal className="h-5 w-5" />
							User Scripts
						</CardTitle>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={onImportClicked} className="select-none">
							<Download className="h-4 w-4 mr-2" />
							Import
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={onExportClicked}
							disabled={userScriptCommands.length === 0}
							className="select-none"
						>
							<Upload className="h-4 w-4 mr-2" />
							Export
						</Button>
						<Button onClick={handleCreateNew} size="sm" className="select-none">
							<Plus className="h-4 w-4 mr-2" />
							Add Command
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{error && (
					<div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>
				)}

				{userScriptCommands.length === 0 ? (
					<div className="text-center py-8 text-muted-foreground">
						<Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
						<div className="text-sm font-medium">No user scripts yet</div>
						<div className="text-xs">Create or import your first user script to get started</div>
					</div>
				) : (
					<div className="space-y-2">
						{userScriptCommands.map((command) => (
							<div
								key={command.id}
								className="group relative px-3 py-2.5 border border-border/50 rounded-lg hover:border-border hover:bg-muted/30 transition-all duration-200 select-none"
							>
								<div className="flex items-center gap-4">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											<h4 className="font-medium text-foreground truncate">
												{command.title}
											</h4>
											<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
												{command.context}
											</span>
											{command.description && (
												<span className="truncate text-xs text-muted-foreground">
													{command.description}
												</span>
											)}
										</div>

										<ShellCommand
											commandString={command.action.commandString}
											showTerminalIcon
											truncateCommand
										/>
									</div>

									<div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleEdit(command.id)}
											className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary select-none"
										>
											<Edit className="h-3.5 w-3.5" />
										</Button>
										<ConfirmDeleteButton
											onDelete={() => handleDelete(command.id)}
											size="sm"
											className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive select-none"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</ConfirmDeleteButton>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>

			{/* Import Dialog */}
			<UserScriptImportDialog
				filePathToImport={importingFile}
				onCloseImportDialog={onCloseImportDialog}
			/>

			<UserScriptExportDialog
				isExportDialogOpen={isExportDialogOpen}
				onCloseExportDialog={() => setIsExportDialogOpen(false)}
			/>
		</Card>
	);
}
