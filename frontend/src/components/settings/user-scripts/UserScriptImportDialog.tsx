import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useUserScriptImporter } from '@/hooks/app-settings/use-user-script-importer';
import { AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { useCallback } from 'react';
import { UserScriptListSelector } from './UserScriptListSelector';

interface UserScriptImportDialogProps {
	filePathToImport: string | undefined;
	onCloseImportDialog: () => void;
}
export function UserScriptImportDialog(props: UserScriptImportDialogProps) {
	const { filePathToImport, onCloseImportDialog } = props;
	const userScriptImporter = useUserScriptImporter(filePathToImport, onCloseImportDialog);
	const { validation, selectedUserScriptIds } = userScriptImporter;

	const isImportDialogOpen = !!filePathToImport && filePathToImport !== '';

	const onChangeIsDialogOpen = useCallback(
		(newValue: boolean) => {
			if (!newValue) {
				onCloseImportDialog();
			}
		},
		[onCloseImportDialog]
	);

	return (
		<Dialog open={isImportDialogOpen} onOpenChange={onChangeIsDialogOpen}>
			<DialogContent className="max-w-2xl max-h-[80vh]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Upload className="h-5 w-5" />
						User Scripts Import
					</DialogTitle>
					<DialogDescription>
						{/* File Name */}
						<div className="space-y-2">
							<span className="text-sm text-muted-foreground truncate">{filePathToImport}</span>
						</div>
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Validation Status */}
					{validation.isValidating && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
							Validating file...
						</div>
					)}

					{validation.error && (
						<div className="flex items-start gap-2 p-3 text-sm bg-destructive/10 text-destructive rounded-md">
							<AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
							<div>
								<div className="font-medium">Validation Error</div>
								<div>{validation.error}</div>
							</div>
						</div>
					)}

					{validation.isValid && validation.data && (
						<div className="space-y-4">
							{/* File Info */}
							<div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
								<CheckCircle className="h-4 w-4 text-green-600" />
								<div className="text-sm">
									<div className="font-medium">Valid user scripts file</div>
									<div className="text-muted-foreground">
										{validation.data.userScripts.length} user scripts found
										{validation.data.exportDate && (
											<>
												{' '}
												• Exported{' '}
												{new Date(validation.data.exportDate).toLocaleDateString()}
											</>
										)}
									</div>
								</div>
							</div>

							{/* Selection Controls */}
							<div className="flex items-center justify-between">
								<div className="text-sm font-medium">
									Select User Scripts to Import ({selectedUserScriptIds.size} of{' '}
									{validation.data.userScripts.length} selected)
								</div>
								<div className="flex gap-2">
									<Button
										size="sm"
										variant="outline"
										onClick={userScriptImporter.onSelectAllScriptIds}
									>
										Select All
									</Button>
									<Button
										size="sm"
										variant="outline"
										onClick={userScriptImporter.onDeselectAllScriptIds}
									>
										Deselect All
									</Button>
								</div>
							</div>

							<UserScriptListSelector
								onToggleScriptId={userScriptImporter.onToggleScriptId}
								selectedUserScriptIds={userScriptImporter.selectedUserScriptIds}
								userScriptCommands={userScriptImporter.validation.data?.userScripts ?? []}
							/>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={onCloseImportDialog}
						disabled={userScriptImporter.isImporting}
					>
						Cancel
					</Button>
					<Button
						onClick={userScriptImporter.onImportSelectedUserScripts}
						disabled={
							!validation.isValid ||
							selectedUserScriptIds.size === 0 ||
							userScriptImporter.isImporting
						}
					>
						{userScriptImporter.isImporting ? (
							<>
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2"></div>
								Importing...
							</>
						) : (
							<>
								<Upload className="h-4 w-4 mr-2" />
								Import {selectedUserScriptIds.size} User Script
								{selectedUserScriptIds.size !== 1 ? 's' : ''}
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
