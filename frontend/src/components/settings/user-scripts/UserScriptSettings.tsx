import { UserScriptImportDialog } from '@/components/settings/user-scripts/UserScriptImportDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { useNavigateRootFilTabs } from '@/hooks/navigation/use-navigate-root-file-tabs';
import { useUserScriptCommandsState } from '@/hooks/state/use-user-script-commands-state';
import { Download, Edit, Plus, Terminal, Trash2, Upload } from 'lucide-react';
import { useCallback, useState } from 'react';
import {
	ExportUserScripts,
	SelectUserScriptFileForImport
} from '../../../../wailsjs/go/backend/App';

export function UserScriptSettings() {
	const { userScriptCommands, isLoading, error, deleteUserScriptCommand } = useUserScriptCommandsState();
	const { onOpenUserScriptCommandEditor } = useNavigateRootFilTabs();
	const [importingFile, setImportingFile] = useState<string | undefined>(undefined);
	const [isExporting, setIsExporting] = useState(false);

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
				console.error('Failed to delete command:', err);
			}
		},
		[deleteUserScriptCommand]
	);

	const handleExport = useCallback(async () => {
		if (userScriptCommands.length === 0) return;

		setIsExporting(true);
		try {
			await ExportUserScripts();
		} catch (err) {
			console.error('Failed to export user scripts:', err);
		} finally {
			setIsExporting(false);
		}
	}, [userScriptCommands]);

	const handleImport = useCallback(async () => {
		// Open file dialog
		const filePath = await SelectUserScriptFileForImport();
		if (!filePath || filePath === '') {
			return;
		}

		setImportingFile(filePath);
	}, []);

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Terminal className="h-5 w-5" />
								Custom Commands
							</CardTitle>
							<CardDescription>Create and manage your custom commands</CardDescription>
						</div>
					</div>
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
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Terminal className="h-5 w-5" />
							Custom Commands
						</CardTitle>
						<CardDescription>
							Create and manage your custom commands for the command palette
						</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={handleImport} className="select-none">
							<Download className="h-4 w-4 mr-2" />
							Import
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleExport}
							disabled={userScriptCommands.length === 0 || isExporting}
							className="select-none"
						>
							{isExporting ? (
								<>
									<div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent mr-2"></div>
									Exporting...
								</>
							) : (
								<>
									<Upload className="h-4 w-4 mr-2" />
									Export
								</>
							)}
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
						<div className="text-sm font-medium">No custom commands yet</div>
						<div className="text-xs">Create your first custom command to get started</div>
					</div>
				) : (
					<div className="space-y-2">
						{userScriptCommands.map((command) => (
							<div
								key={command.id}
								className="group relative px-3 py-2.5 border border-border/50 rounded-lg hover:border-border hover:bg-muted/30 transition-all duration-200 select-none"
							>
								<div className="flex items-center justify-between gap-4">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											<h4 className="font-medium text-foreground truncate">
												{command.title}
											</h4>
											<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
												{command.context}
											</span>
										</div>

										<div className="flex items-center gap-3 text-xs text-muted-foreground">
											{command.description && (
												<span className="truncate">{command.description}</span>
											)}
											<div className="flex items-center gap-1.5 shrink-0">
												<Terminal className="h-3 w-3" />
												<code className="font-mono bg-muted/50 px-1.5 py-0.5 rounded">
													{command.action.commandString}
												</code>
											</div>
										</div>
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
		</Card>
	);
}
