import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUserScriptExporter } from '@/hooks/app-settings/use-user-script-exporter';
import { Upload } from 'lucide-react';
import { useCallback } from 'react';
import { UserScriptListSelector } from './UserScriptListSelector';

interface UserScriptExportDialogProps {
	isExportDialogOpen: boolean;
	onCloseExportDialog: () => void;
}
export function UserScriptExportDialog(props: UserScriptExportDialogProps) {
	const { isExportDialogOpen, onCloseExportDialog } = props;

	const userScriptExporter = useUserScriptExporter(onCloseExportDialog);

	const onChangeIsDialogOpen = useCallback(
		(newValue: boolean) => {
			if (!newValue) {
				onCloseExportDialog();
			}
		},
		[onCloseExportDialog]
	);

	return (
		<Dialog open={isExportDialogOpen} onOpenChange={onChangeIsDialogOpen}>
			<DialogContent className="max-w-2xl max-h-[80vh]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Upload className="h-5 w-5" />
						User Scripts Export
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-4">
						{/* Selection Controls */}
						<div className="flex items-center justify-between">
							<div className="text-sm font-medium">
								Select User Scripts to Export ({userScriptExporter.selectedUserScriptIds.size}{' '}
								of {userScriptExporter.userScriptCommands.length} selected)
							</div>
							<div className="flex gap-2">
								<Button
									size="sm"
									variant="outline"
									onClick={userScriptExporter.onSelectAllScriptsForExport}
								>
									Select All
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={userScriptExporter.onDeselectAllScriptsForExport}
								>
									Deselect All
								</Button>
							</div>
						</div>

						<UserScriptListSelector
							onToggleScriptId={userScriptExporter.onToggleScriptId}
							selectedUserScriptIds={userScriptExporter.selectedUserScriptIds}
							userScriptCommands={userScriptExporter.userScriptCommands}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={onCloseExportDialog}
						disabled={userScriptExporter.isExporting}
					>
						Cancel
					</Button>
					<Button
						onClick={userScriptExporter.onExportScripts}
						disabled={userScriptExporter.isExporting}
					>
						{userScriptExporter.isExporting ? (
							<>
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2"></div>
								Exporting...
							</>
						) : (
							<>
								<Upload className="h-4 w-4 mr-2" />
								Export {userScriptExporter.selectedUserScriptIds.size} User Script
								{userScriptExporter.selectedUserScriptIds.size !== 1 ? 's' : ''}
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
