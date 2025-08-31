import Logger from '@/utils/logger';
import { useCallback, useEffect, useState } from 'react';
import { ExportUserScripts } from '../../../wailsjs/go/backend/App';
import { useUserScriptCommandsState } from '../state/use-user-script-commands-state';
import { backend } from 'wailsjs/go/models';

export function useUserScriptExporter(onCloseImportDialog: () => void) {
	const { userScriptCommands } = useUserScriptCommandsState();
	const [selectedUserScriptIds, setSelectedUserScriptIds] = useState<Set<string>>(new Set());
	const [isExporting, setIsExporting] = useState(false);

	const onDeselectAllScriptsForExport = useCallback(() => {
		setSelectedUserScriptIds(new Set());
	}, [setSelectedUserScriptIds]);

	const onSelectAllScriptsForExport = useCallback(async () => {
		const scriptIds = userScriptCommands.map((script) => script.id);
		setSelectedUserScriptIds(new Set(scriptIds));
	}, [setSelectedUserScriptIds]);

	useEffect(() => {
		onSelectAllScriptsForExport();
	}, []);

	const onToggleScriptId = useCallback(
		(userScriptId: string, checked: boolean) => {
			setSelectedUserScriptIds((prev) => {
				const newSet = new Set(prev);

				if (checked) {
					newSet.add(userScriptId);
				} else {
					newSet.delete(userScriptId);
				}

				return newSet;
			});
		},
		[setSelectedUserScriptIds]
	);

	const onExportScripts = useCallback(async () => {
		if (userScriptCommands.length === 0) return;

		try {
			setIsExporting(true);
			const selectedIds = Array.from(selectedUserScriptIds);
			await ExportUserScripts(selectedIds);

			// Close dialog and reset
			onCloseImportDialog();
		} catch (error) {
			Logger.error(`Failed to export user scripts: ${error}`);
		} finally {
			setIsExporting(false);
		}
	}, [setIsExporting, selectedUserScriptIds, onCloseImportDialog]);

	return {
		userScriptCommands: userScriptCommands as backend.UserDefinedCommandDefinition[],
		isExporting,
		onToggleScriptId,
		onSelectAllScriptsForExport,
		onDeselectAllScriptsForExport,
		selectedUserScriptIds,
		onExportScripts,
	};
}
