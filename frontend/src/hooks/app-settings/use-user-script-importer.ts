import { useCallback, useEffect, useState } from 'react';
import { ImportCustomUserScripts, ValidateUserScriptsFile } from '../../../wailsjs/go/backend/App';
import { backend } from '../../../wailsjs/go/models';
import { useCustomCommandsState } from '../state/use-custom-commands-state';

interface ValidationState {
	isValidating: boolean;
	isValid: boolean;
	error: string | null;
	data: backend.UserScriptExportData | null;
}

export function useUserScriptImporter(filePathToImport: string | undefined, onCloseImportDialog: () => void) {
	const { reloadUserScripts } = useCustomCommandsState();
	const [validation, setValidation] = useState<ValidationState>({
		isValidating: false,
		isValid: false,
		error: null,
		data: null,
	});
	const [selectedUserScriptIds, setSelectedUserScriptIds] = useState<Set<string>>(new Set());
	const [isImporting, setIsImporting] = useState(false);

	const validateFile = useCallback(async () => {
		if (!filePathToImport) {
			return;
		}

		setValidation({
			isValidating: true,
			isValid: false,
			error: null,
			data: null,
		});

		setSelectedUserScriptIds(new Set());

		try {
			// Validate the selected file
			const validationResult = await ValidateUserScriptsFile(filePathToImport);

			setValidation({
				isValidating: false,
				isValid: true,
				error: null,
				data: validationResult,
			});

			// Auto-select all user scripts by default
			const allIds = validationResult.userScripts.map((script) => script.id);
			setSelectedUserScriptIds(new Set(allIds));
		} catch (error) {
			setValidation({
				isValidating: false,
				isValid: false,
				error: error instanceof Error ? error.message : `Failed to validate file: ${error}`,
				data: null,
			});
		}
	}, [setValidation, filePathToImport, setSelectedUserScriptIds]);

	useEffect(() => {
		if (!filePathToImport) {
			return;
		}
		validateFile();
		// validate the file
	}, [filePathToImport]);

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

	const onSelectAllScriptIds = useCallback(() => {
		if (!validation.data) {
			return;
		}
		// Auto-select all user scripts by default
		const allIds = validation.data.userScripts.map((script) => script.id);
		setSelectedUserScriptIds(new Set(allIds));
	}, [validation.data, setSelectedUserScriptIds]);

	const onDeselectAllScriptIds = useCallback(() => {
		setSelectedUserScriptIds(new Set());
	}, [setSelectedUserScriptIds]);

	const onImportSelectedUserScripts = useCallback(async () => {
		if (!filePathToImport) { 
			return
		}
		
		try {
			setIsImporting(true);
			const selectedIds = Array.from(selectedUserScriptIds);
			await ImportCustomUserScripts(filePathToImport, selectedIds);
			await reloadUserScripts();

			// Close dialog and reset
			onCloseImportDialog();
		} catch (error) {
			setValidation((prev) => ({
				...prev,
				error: error instanceof Error ? error.message : `Failed to import user scripts: ${error}`,
			}));
		} finally {
			setIsImporting(false);
		}
	}, [setIsImporting, filePathToImport, selectedUserScriptIds, reloadUserScripts, onCloseImportDialog]);

	return {
		onToggleScriptId,
		onSelectAllScriptIds,
		onDeselectAllScriptIds,
		onImportSelectedUserScripts,

		isImporting,
		validation,
		selectedUserScriptIds,
	};
}
