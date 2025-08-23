import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { TagInput } from '@/components/ui/tag-input';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { ParameterForm } from '@/components/forms/ParameterForm';
import { useCustomCommandsState } from '@/hooks/state/use-custom-commands-state';
import { Plus, Trash2, Save, Terminal } from 'lucide-react';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigateRootFilTabs } from '@/hooks/navigation/use-navigate-root-file-tabs';
import { z } from 'zod';
import {
	UserDefinedCommandDefinition,
	UserDefinedParameter,
} from '@/hooks/command-palette/use-custom-command';
import { CommandPaletteContextKey } from '@/types/command-palette';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

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

interface CustomCommandEditorProps {
	// Is assumed to stay as-is, even if the command's ID gets saved to something different
	originalCommandId?: string;
}

export default function CustomCommandEditor({ originalCommandId }: CustomCommandEditorProps) {
	const { getCustomCommand, saveCustomCommand, deleteCustomCommand } = useCustomCommandsState();
	const rootNavigation = useNavigateRootFilTabs();

	const [formData, setFormData] = useState<UserDefinedCommandDefinition>({
		id: '',
		title: '',
		description: '',
		keywords: [],
		context: CommandPaletteContextKey.Root,
		parameters: [],
		action: {
			commandString: '',
		},
	});

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isLoading, setIsLoading] = useState(false);

	// Load existing command if editing
	useEffect(() => {
		if (originalCommandId) {
			const existingCommand = getCustomCommand(originalCommandId);
			if (existingCommand) {
				setFormData({
					...existingCommand,
					keywords: existingCommand.keywords || [],
					parameters: existingCommand.parameters || [],
				});
			}
		} else {
			// Generate a unique ID for new commands
			setFormData((prev) => ({
				...prev,
				id: `custom-${Date.now()}`,
			}));
		}
	}, [originalCommandId, getCustomCommand]);

	const validateForm = useCallback(() => {
		try {
			commandSchema.parse(formData);
			setErrors({});
			return true;
		} catch (error) {
			if (error instanceof z.ZodError) {
				const newErrors: Record<string, string> = {};
				error.issues.forEach((err) => {
					const path = err.path.join('.');
					newErrors[path] = err.message;
				});
				setErrors(newErrors);
			}
			return false;
		}
	}, [formData]);

	const onCloseEditorPage = () => {
		rootNavigation.onCloseCustomCommandEditor(originalCommandId);
	};

	const handleSave = useCallback(async () => {
		if (!validateForm()) {
			return;
		}

		try {
			setIsLoading(true);
			await saveCustomCommand(formData);
			onCloseEditorPage();
		} catch (error) {
			console.error('Failed to save command:', error);
		} finally {
			setIsLoading(false);
		}
	}, [formData, validateForm, saveCustomCommand, onCloseEditorPage]);

	const handleDelete = useCallback(async () => {
		if (!originalCommandId) return;

		try {
			setIsLoading(true);
			await deleteCustomCommand(originalCommandId);
			onCloseEditorPage();
		} catch (error) {
			console.error('Failed to delete command:', error);
		} finally {
			setIsLoading(false);
		}
	}, [originalCommandId, deleteCustomCommand, onCloseEditorPage]);

	const handleCancel = useCallback(() => {
		onCloseEditorPage();
	}, [onCloseEditorPage]);

	const updateFormField = useCallback(
		<T extends typeof formData, K extends keyof T>(key: K, value: T[K]) => {
			setFormData((prev) => ({
				...prev,
				[key]: value,
			}));
		},
		[]
	);

	const addParameter = useCallback(() => {
		const newParam: UserDefinedParameter = {
			id: ``,
			type: 'string',
			prompt: '',
			required: false,
		};

		setFormData((prev) => ({
			...prev,
			parameters: [...(prev.parameters || []), newParam],
		}));
	}, []);

	const updateParameter = useCallback(
		<T extends UserDefinedParameter, K extends keyof T>(index: number, paramField: K, value: T[K]) => {
			setFormData((prev) => ({
				...prev,
				parameters:
					prev.parameters?.map((param, i) =>
						i === index ? { ...param, [paramField]: value } : param
					) || [],
			}));
		},
		[]
	);

	const removeParameter = useCallback((index: number) => {
		setFormData((prev) => ({
			...prev,
			parameters: prev.parameters?.filter((_, i) => i !== index) || [],
		}));
	}, []);

	// Memoized sub-components to prevent unnecessary re-renders
	const CommandBasicInfoForm = useMemo(
		() => (
			<>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<Label htmlFor="title">Title *</Label>
						<Input
							id="title"
							value={formData.title}
							onChange={(e) => updateFormField('title', e.target.value)}
							placeholder="Git: My Custom Command"
							className={errors.title ? 'border-destructive' : ''}
						/>
						{errors.title && <div className="text-sm text-destructive mt-1">{errors.title}</div>}
					</div>

					<div>
						<Label htmlFor="context">Context *</Label>
						<Select
							value={formData.context}
							onValueChange={(value) =>
								updateFormField('context', value as CommandPaletteContextKey)
							}
						>
							<SelectTrigger
								className={'w-full ' + (errors.context ? 'border-destructive' : '')}
							>
								<SelectValue placeholder="Command context" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{[
										CommandPaletteContextKey.Root,
										CommandPaletteContextKey.Repo,
										CommandPaletteContextKey.ApplicationLogs,
										CommandPaletteContextKey.Settings,
									].map((contextType) => (
										<SelectItem key={contextType} value={contextType}>
											{contextType}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
						{errors.context && (
							<div className="text-sm text-destructive mt-1">{errors.context}</div>
						)}
					</div>
				</div>

				<div>
					<Label htmlFor="description">Description</Label>
					<Input
						id="description"
						value={formData.description || ''}
						onChange={(e) => updateFormField('description', e.target.value)}
						placeholder="Brief description of what this command does"
					/>
				</div>

				<div>
					<Label htmlFor="keywords">Keywords</Label>
					<TagInput
						value={formData.keywords || []}
						onChange={(keywords) => updateFormField('keywords', keywords)}
						placeholder="git, status, branch"
					/>
				</div>

				<div>
					<Label htmlFor="commandString">Command String *</Label>
					<Input
						id="commandString"
						value={formData.action.commandString}
						onChange={(e) => updateFormField('action', { commandString: e.target.value })}
						placeholder="git status --porcelain"
						className={errors['action.commandString'] ? 'border-destructive' : ''}
					/>
					{errors['action.commandString'] && (
						<div className="text-sm text-destructive mt-1">{errors['action.commandString']}</div>
					)}
					<div className="text-sm text-muted-foreground mt-1">
						Use {`{{parameterID}}`} to reference parameters
					</div>
				</div>
			</>
		),
		[
			formData.title,
			formData.context,
			formData.description,
			formData.keywords,
			formData.action.commandString,
			errors,
			updateFormField,
		]
	);

	const ParameterManagementSection = useMemo(
		() => (
			<div>
				<div className="flex items-center justify-between mb-4">
					<Label className="text-base font-medium">Parameters</Label>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={addParameter}
						className="select-none"
					>
						<Plus className="h-4 w-4 mr-2" />
						Add Parameter
					</Button>
				</div>

				{formData.parameters && formData.parameters.length > 0 ? (
					<div className="space-y-3">
						{formData.parameters.map((param, index) => (
							<ParameterForm
								key={index}
								parameter={param}
								parameterIndex={index}
								onUpdate={updateParameter}
								onRemove={removeParameter}
							/>
						))}
					</div>
				) : (
					<div className="text-center py-8 text-muted-foreground">
						<div className="text-sm">No parameters defined</div>
						<div className="text-xs">Parameters allow users to provide input to your command</div>
					</div>
				)}
			</div>
		),
		[formData.parameters, addParameter, updateParameter, removeParameter]
	);

	const CommandActionButtons = useMemo(
		() => (
			<div className="flex justify-between">
				<div>
					{originalCommandId && (
						<ConfirmDeleteButton onDelete={handleDelete} disabled={isLoading}>
							<Trash2 className="h-4 w-4 mr-2" />
							Delete Command
						</ConfirmDeleteButton>
					)}
				</div>

				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={handleCancel}
						disabled={isLoading}
						className="select-none"
					>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={isLoading} className="select-none">
						<Save className="h-4 w-4 mr-2" />
						{isLoading ? 'Saving...' : 'Save Command'}
					</Button>
				</div>
			</div>
		),
		[originalCommandId, handleDelete, handleCancel, handleSave, isLoading]
	);

	return (
		<div className="container mx-auto max-w-4xl pb-4">
			<div className="flex items-center gap-3 p-4">
				<Terminal className="h-6 w-6" />
				<h1 className="text-2xl font-bold">
					{originalCommandId ? 'Edit Custom Command' : 'Create Custom Command'}
				</h1>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Command Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					{CommandBasicInfoForm}
					<Separator />
					{ParameterManagementSection}
					<Separator />
					{CommandActionButtons}
				</CardContent>
			</Card>
		</div>
	);
}
