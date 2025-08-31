import { CommandPaletteContextKey } from '@/types/command-palette';
import { useCallback, useEffect } from 'react';
import z from 'zod';
import { useNavigateRootFilTabs } from '../navigation/use-navigate-root-file-tabs';
import { createMappedAtom, useMapPrimitive } from '../state/primitives/use-map-primitive';
import { useUserScriptCommandsState } from '../state/use-user-script-commands-state';
import { UserDefinedCommandDefinition, UserDefinedParameter } from './use-user-script-command';

// Zod validation schema
const parameterSchema = z.object({
	id: z.string().min(1, 'Parameter ID is required'),
	type: z.enum(['string', 'select']),
	prompt: z.string().min(1, 'Parameter prompt is required'),
	description: z.string().optional(),
	placeholder: z.string().optional(),
	required: z.boolean().optional(),
	allowCustomInput: z.boolean().optional(),
	options: z.array(z.string()).optional(),
});

const commandSchema = z.object({
	id: z.string().min(1, 'Command ID is required'),
	title: z.string().min(1, 'Title is required'),
	description: z.string().optional(),
	keywords: z.array(z.string()).optional(),
	context: z.enum(CommandPaletteContextKey, { message: 'Context must be either global or repo' }),
	parameters: z.array(parameterSchema).optional(),
	action: z.object({
		commandString: z.string().min(1, 'Command string is required'),
	}),
});

const formDataAtom = createMappedAtom<Partial<UserDefinedCommandDefinition>>();
const formErrorsAtom = createMappedAtom<Record<string, string>>();
const isLoadingAtom = createMappedAtom<'notInitialized' | 'loading' | 'finishedLoading'>();

export function useUserScriptEditorState(sessionKey: string, originalCommandId: string | undefined) {
	const { getUserScriptCommand, saveUserScriptCommand, deleteUserScriptCommand } =
		useUserScriptCommandsState();

	const rootNavigation = useNavigateRootFilTabs();

	const _formDataPrim = useMapPrimitive(formDataAtom, sessionKey);
	const _errorsPrim = useMapPrimitive(formErrorsAtom, sessionKey);
	const _isLoadingPrim = useMapPrimitive(isLoadingAtom, sessionKey, 'notInitialized');

	const isNewCommand = !originalCommandId || originalCommandId === '';
	const formData = _formDataPrim.value || {
		id: '',
		title: '',
		description: '',
		keywords: [],
		context: CommandPaletteContextKey.Root,
		parameters: [],
		action: {
			commandString: '',
		},
	};

	// Load existing command if editing
	useEffect(() => {
		if (_isLoadingPrim.value !== 'notInitialized') {
			return;
		}

		if (!isNewCommand && originalCommandId) {
			const existingCommand = getUserScriptCommand(originalCommandId);
			if (existingCommand) {
				_formDataPrim.set({
					...existingCommand,
					keywords: existingCommand.keywords || [],
					parameters: existingCommand.parameters || [],
				});

				_isLoadingPrim.set('finishedLoading');
				return;
			}
		}

		// Generate a unique ID for new commands
		_formDataPrim.set((prev) => ({
			...prev,
			id: `custom-${Date.now()}`,
		}));
		_isLoadingPrim.set('finishedLoading');
	}, [isNewCommand, originalCommandId, getUserScriptCommand, _formDataPrim.set, _isLoadingPrim]);

	const validateForm = useCallback(() => {
		try {
			commandSchema.parse(formData);
			_errorsPrim.set({});
			return true;
		} catch (error) {
			if (error instanceof z.ZodError) {
				const newErrors: Record<string, string> = {};
				error.issues.forEach((err) => {
					const path = err.path.join('.');
					newErrors[path] = err.message;
				});
				_errorsPrim.set(newErrors);
			}
			return false;
		}
	}, [formData]);

	const onCloseEditorPage = () => {
		rootNavigation.onCloseUserScriptCommandEditor(originalCommandId);
	};

	const handleSave = useCallback(async () => {
		if (!validateForm()) {
			return;
		}

		try {
			_isLoadingPrim.set('loading');
			await saveUserScriptCommand(formData as UserDefinedCommandDefinition);
			onCloseEditorPage();
		} catch (error) {
			console.error('Failed to save command:', error);
		} finally {
			_isLoadingPrim.set('finishedLoading');
		}
	}, [
		formData,
		_formDataPrim.value,
		validateForm,
		saveUserScriptCommand,
		onCloseEditorPage,
		_isLoadingPrim.set,
	]);

	const handleDelete = useCallback(async () => {
		if (!originalCommandId) return;

		try {
			_isLoadingPrim.set('loading');
			await deleteUserScriptCommand(originalCommandId);
			onCloseEditorPage();
		} catch (error) {
			console.error('Failed to delete command:', error);
		} finally {
			_isLoadingPrim.set('finishedLoading');
		}
	}, [originalCommandId, deleteUserScriptCommand, onCloseEditorPage, _isLoadingPrim.set]);

	const handleCancel = useCallback(() => {
		onCloseEditorPage();
	}, [onCloseEditorPage]);

	const updateFormField = useCallback(
		<T extends typeof formData, K extends keyof T>(key: K, value: T[K]) => {
			_formDataPrim.set((prev) => ({
				...(prev || {}),
				[key]: value,
			}));
		},
		[_formDataPrim.set]
	);

	const addParameter = useCallback(() => {
		const newParam: UserDefinedParameter = {
			id: ``,
			type: 'string',
			prompt: '',
			required: false,
		};

		_formDataPrim.set((prev) => ({
			...prev,
			parameters: [...(prev?.parameters || []), newParam],
		}));
	}, [_formDataPrim.set]);

	const updateParameter = useCallback(
		<T extends UserDefinedParameter, K extends keyof T>(index: number, paramField: K, value: T[K]) => {
			_formDataPrim.set((prev) => ({
				...prev,
				parameters:
					prev?.parameters?.map((param, i) =>
						i === index ? { ...param, [paramField]: value } : param
					) || [],
			}));
		},
		[_formDataPrim.set]
	);

	const removeParameter = useCallback(
		(index: number) => {
			_formDataPrim.set((prev) => ({
				...prev,
				parameters: prev?.parameters?.filter((_, i) => i !== index) || [],
			}));
		},
		[_formDataPrim.set]
	);

	return {
		formData,
		errors: _errorsPrim.value,
		isLoading: _isLoadingPrim.value === 'loading',
		onCloseEditorPage,
		handleCancel,
		handleDelete,
		handleSave,
		updateFormField,
		addParameter,
		updateParameter,
		removeParameter,
	};
}
