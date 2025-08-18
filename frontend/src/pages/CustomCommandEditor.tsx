import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCustomCommandsState, UserDefinedCommandDefinition, UserDefinedParameter } from '@/hooks/state/use-custom-commands-state';
import { ArrowLeft, Plus, Trash2, Save, Terminal } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigateRootFilTabs } from '@/hooks/navigation/use-navigate-root-file-tabs';
import { z } from 'zod';

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
	context: z.enum(['global', 'repo'], { message: 'Context must be either global or repo' }),
	parameters: z.array(parameterSchema).optional(),
	action: z.object({
		commandString: z.string().min(1, 'Command string is required'),
	}),
});

interface CustomCommandEditorProps {
	commandId?: string;
}

export default function CustomCommandEditor({ commandId }: CustomCommandEditorProps) {
	const { getCustomCommand, saveCustomCommand, deleteCustomCommand } = useCustomCommandsState();
	const { onOpenSettings } = useNavigateRootFilTabs();
	
	const [formData, setFormData] = useState<UserDefinedCommandDefinition>({
		id: '',
		title: '',
		description: '',
		keywords: [],
		context: 'global',
		parameters: [],
		action: {
			commandString: '',
		},
	});

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isLoading, setIsLoading] = useState(false);

	// Load existing command if editing
	useEffect(() => {
		if (commandId) {
			const existingCommand = getCustomCommand(commandId);
			if (existingCommand) {
				setFormData({
					...existingCommand,
					keywords: existingCommand.keywords || [],
					parameters: existingCommand.parameters || [],
				});
			}
		} else {
			// Generate a unique ID for new commands
			setFormData(prev => ({
				...prev,
				id: `custom-${Date.now()}`,
			}));
		}
	}, [commandId, getCustomCommand]);

	const validateForm = useCallback(() => {
		try {
			commandSchema.parse(formData);
			setErrors({});
			return true;
		} catch (error) {
			if (error instanceof z.ZodError) {
				const newErrors: Record<string, string> = {};
				error.errors.forEach((err) => {
					const path = err.path.join('.');
					newErrors[path] = err.message;
				});
				setErrors(newErrors);
			}
			return false;
		}
	}, [formData]);

	const handleSave = useCallback(async () => {
		if (!validateForm()) {
			return;
		}

		try {
			setIsLoading(true);
			await saveCustomCommand(formData);
			onOpenSettings();
		} catch (error) {
			console.error('Failed to save command:', error);
		} finally {
			setIsLoading(false);
		}
	}, [formData, validateForm, saveCustomCommand, onOpenSettings]);

	const handleDelete = useCallback(async () => {
		if (!commandId) return;

		if (confirm('Are you sure you want to delete this command?')) {
			try {
				setIsLoading(true);
				await deleteCustomCommand(commandId);
				onOpenSettings();
			} catch (error) {
				console.error('Failed to delete command:', error);
			} finally {
				setIsLoading(false);
			}
		}
	}, [commandId, deleteCustomCommand, onOpenSettings]);

	const handleCancel = useCallback(() => {
		onOpenSettings();
	}, [onOpenSettings]);

	const updateFormField = useCallback((field: string, value: any) => {
		setFormData(prev => ({
			...prev,
			[field]: value,
		}));
	}, []);

	const updateKeywords = useCallback((keywords: string) => {
		const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
		updateFormField('keywords', keywordArray);
	}, [updateFormField]);

	const addParameter = useCallback(() => {
		const newParam: UserDefinedParameter = {
			id: `param-${Date.now()}`,
			type: 'string',
			prompt: '',
			required: false,
		};
		
		setFormData(prev => ({
			...prev,
			parameters: [...(prev.parameters || []), newParam],
		}));
	}, []);

	const updateParameter = useCallback((index: number, field: string, value: any) => {
		setFormData(prev => ({
			...prev,
			parameters: prev.parameters?.map((param, i) => 
				i === index ? { ...param, [field]: value } : param
			) || [],
		}));
	}, []);

	const removeParameter = useCallback((index: number) => {
		setFormData(prev => ({
			...prev,
			parameters: prev.parameters?.filter((_, i) => i !== index) || [],
		}));
	}, []);

	const updateParameterOptions = useCallback((index: number, options: string) => {
		const optionArray = options.split(',').map(o => o.trim()).filter(o => o.length > 0);
		updateParameter(index, 'options', optionArray);
	}, [updateParameter]);

	return (
		<div className="container mx-auto p-4 max-w-4xl">
			<div className="mb-6">
				<Button 
					variant="ghost" 
					onClick={handleCancel}
					className="mb-4 select-none"
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Settings
				</Button>
				
				<div className="flex items-center gap-3">
					<Terminal className="h-6 w-6" />
					<h1 className="text-2xl font-bold">
						{commandId ? 'Edit Custom Command' : 'Create Custom Command'}
					</h1>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Command Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Basic Information */}
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
							<select
								id="context"
								value={formData.context}
								onChange={(e) => updateFormField('context', e.target.value)}
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<option value="global">Global</option>
								<option value="repo">Repository</option>
							</select>
							{errors.context && <div className="text-sm text-destructive mt-1">{errors.context}</div>}
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
						<Label htmlFor="keywords">Keywords (comma-separated)</Label>
						<Input
							id="keywords"
							value={formData.keywords?.join(', ') || ''}
							onChange={(e) => updateKeywords(e.target.value)}
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
						{errors['action.commandString'] && <div className="text-sm text-destructive mt-1">{errors['action.commandString']}</div>}
						<div className="text-sm text-muted-foreground mt-1">
							Use {`{{parameterName}}`} to reference parameters
						</div>
					</div>

					<Separator />

					{/* Parameters */}
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
							<div className="space-y-4">
								{formData.parameters.map((param, index) => (
									<Card key={param.id} className="p-4">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<Label>Parameter ID *</Label>
												<Input
													value={param.id}
													onChange={(e) => updateParameter(index, 'id', e.target.value)}
													placeholder="branchName"
												/>
											</div>

											<div>
												<Label>Type</Label>
												<select
													value={param.type}
													onChange={(e) => updateParameter(index, 'type', e.target.value)}
													className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
												>
													<option value="string">String</option>
													<option value="select">Select</option>
												</select>
											</div>

											<div>
												<Label>Prompt *</Label>
												<Input
													value={param.prompt}
													onChange={(e) => updateParameter(index, 'prompt', e.target.value)}
													placeholder="Branch name"
												/>
											</div>

											<div>
												<Label>Placeholder</Label>
												<Input
													value={param.placeholder || ''}
													onChange={(e) => updateParameter(index, 'placeholder', e.target.value)}
													placeholder="main, develop, feature/..."
												/>
											</div>

											<div>
												<Label>Description</Label>
												<Input
													value={param.description || ''}
													onChange={(e) => updateParameter(index, 'description', e.target.value)}
													placeholder="Choose the branch to checkout"
												/>
											</div>

											<div className="flex items-center gap-4">
												<label className="flex items-center gap-2 text-sm">
													<input
														type="checkbox"
														checked={param.required || false}
														onChange={(e) => updateParameter(index, 'required', e.target.checked)}
													/>
													Required
												</label>

												{param.type === 'select' && (
													<label className="flex items-center gap-2 text-sm">
														<input
															type="checkbox"
															checked={param.allowCustomInput || false}
															onChange={(e) => updateParameter(index, 'allowCustomInput', e.target.checked)}
														/>
														Allow custom input
													</label>
												)}
											</div>

											{param.type === 'select' && (
												<div className="md:col-span-2">
													<Label>Options (comma-separated)</Label>
													<Input
														value={param.options?.join(', ') || ''}
														onChange={(e) => updateParameterOptions(index, e.target.value)}
														placeholder="main, develop, staging"
													/>
												</div>
											)}
										</div>

										<div className="flex justify-end mt-4">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => removeParameter(index)}
												className="text-muted-foreground hover:text-destructive select-none"
											>
												<Trash2 className="h-4 w-4 mr-2" />
												Remove
											</Button>
										</div>
									</Card>
								))}
							</div>
						) : (
							<div className="text-center py-8 text-muted-foreground">
								<div className="text-sm">No parameters defined</div>
								<div className="text-xs">Parameters allow users to provide input to your command</div>
							</div>
						)}
					</div>

					<Separator />

					{/* Action Buttons */}
					<div className="flex justify-between">
						<div>
							{commandId && (
								<Button
									type="button"
									variant="destructive"
									onClick={handleDelete}
									disabled={isLoading}
									className="select-none"
								>
									<Trash2 className="h-4 w-4 mr-2" />
									Delete Command
								</Button>
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
							<Button
								onClick={handleSave}
								disabled={isLoading}
								className="select-none"
							>
								<Save className="h-4 w-4 mr-2" />
								{isLoading ? 'Saving...' : 'Save Command'}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}