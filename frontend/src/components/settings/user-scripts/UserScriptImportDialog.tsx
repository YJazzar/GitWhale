import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserScriptImporter } from '@/hooks/app-settings/use-user-script-importer';
import { AlertCircle, CheckCircle, Terminal, Upload } from 'lucide-react';
import { backend } from '../../../../wailsjs/go/models';
import { useCallback } from 'react';

interface UserScriptImportDialogProps {
	filePathToImport: string | undefined;
	onCloseImportDialog: () => void;
}
export function UserScriptImportDialog(props: UserScriptImportDialogProps) {
	const { filePathToImport, onCloseImportDialog } = props;
	const userScriptImporter = useUserScriptImporter(filePathToImport, onCloseImportDialog);
	const { validation, selectedUserScriptIds } = userScriptImporter;

	const isImportDialogOpen = !!filePathToImport && filePathToImport !== '';

	const onToggleUserScriptCallbackFactory = useCallback(
		(userScriptId: string) => {
			return (checked: boolean) => {
				userScriptImporter.onToggleScriptId(userScriptId, !!checked);
			};
		},
		[userScriptImporter]
	);

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

							{/* User Scripts List */}
							<ScrollArea className="h-60 border rounded-md">
								<div className="p-4 space-y-3">
									{validation.data.userScripts.map(
										(userScript: backend.UserDefinedCommandDefinition) => (
											<div
												key={userScript.id}
												className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
											>
												<Checkbox
													checked={selectedUserScriptIds.has(userScript.id)}
													onCheckedChange={onToggleUserScriptCallbackFactory(
														userScript.id
													)}
													className="mt-1"
												/>
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2 mb-1">
														<h4 className="font-medium text-sm truncate">
															{userScript.title}
														</h4>
														<Badge variant="secondary" className="text-xs">
															{userScript.context}
														</Badge>
													</div>
													{userScript.description && (
														<p className="text-xs text-muted-foreground mb-2 truncate">
															{userScript.description}
														</p>
													)}
													<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
														<Terminal className="h-3 w-3" />
														<code className="font-mono bg-muted/50 px-1.5 py-0.5 rounded">
															{userScript.action.commandString}
														</code>
													</div>
												</div>
											</div>
										)
									)}
								</div>
							</ScrollArea>
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
