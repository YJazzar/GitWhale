import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TagInput } from '@/components/ui/tag-input';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { UserDefinedParameter, UserDefinedSelectParameter } from '@/hooks/command-palette/use-custom-command';
import { Trash2 } from 'lucide-react';
import { memo } from 'react';

interface ParameterFormProps {
	parameter: UserDefinedParameter;
	parameterIndex: number;
	onUpdate: <T extends UserDefinedParameter, K extends keyof T>(
		index: number,
		paramField: K,
		value: T[K]
	) => void;
	onRemove: (index: number) => void;
}

export const ParameterForm = memo(
	function ParameterForm({ parameter, parameterIndex, onUpdate, onRemove }: ParameterFormProps) {
		return (
			<Card className="p-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<Label className="text-sm">Parameter ID *</Label>
						<Input
							value={parameter.id}
							onChange={(e) => onUpdate(parameterIndex, 'id', e.target.value)}
							placeholder="branchName"
							className="h-8 text-sm"
						/>
					</div>

					<div>
						<Label className="text-sm">Type</Label>
						<Select
							value={parameter.type}
							onValueChange={(value) =>
								onUpdate(parameterIndex, 'type', value as UserDefinedParameter['type'])
							}
						>
							<SelectTrigger className="h-8 text-sm">
								<SelectValue placeholder="Parameter type" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="string">String</SelectItem>
									<SelectItem value="select">Select</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label className="text-sm">Prompt *</Label>
						<Input
							value={parameter.prompt}
							onChange={(e) => onUpdate(parameterIndex, 'prompt', e.target.value)}
							placeholder="Branch name"
							className="h-8 text-sm"
						/>
					</div>

					<div>
						<Label className="text-sm">Placeholder</Label>
						<Input
							value={parameter.placeholder || ''}
							onChange={(e) => onUpdate(parameterIndex, 'placeholder', e.target.value)}
							placeholder="main, develop, feature/..."
							className="h-8 text-sm"
						/>
					</div>

					<div className="md:col-span-2">
						<Label className="text-sm">Description</Label>
						<Input
							value={parameter.description || ''}
							onChange={(e) => onUpdate(parameterIndex, 'description', e.target.value)}
							placeholder="Choose the branch to checkout"
							className="h-8 text-sm"
						/>
					</div>

					<div className="md:col-span-2 flex items-center gap-6">
						<div className="flex items-center space-x-2">
							<Checkbox
								id={`required-${parameter.id}`}
								checked={parameter.required || false}
								onCheckedChange={(checked) => onUpdate(parameterIndex, 'required', !!checked)}
							/>
							<Label htmlFor={`required-${parameter.id}`} className="text-sm">
								Required
							</Label>
						</div>

						{parameter.type === 'select' && (
							<div className="flex items-center space-x-2">
								<Checkbox
									id={`custom-input-${parameter.id}`}
									checked={parameter.allowCustomInput || false}
									onCheckedChange={(checked) =>
										onUpdate<
											UserDefinedSelectParameter,
											keyof UserDefinedSelectParameter
										>(parameterIndex, 'allowCustomInput', checked)
									}
								/>
								<Label htmlFor={`custom-input-${parameter.id}`} className="text-sm">
									Allow custom input
								</Label>
							</div>
						)}
					</div>

					{parameter.type === 'select' && (
						<div className="md:col-span-2">
							<Label className="text-sm">Options</Label>
							<TagInput
								value={parameter.options || []}
								onChange={(options) =>
									onUpdate<UserDefinedSelectParameter, keyof UserDefinedSelectParameter>(
										parameterIndex,
										'options',
										options
									)
								}
								placeholder="main, develop, staging"
							/>
						</div>
					)}
				</div>

				<div className="flex justify-end mt-3">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => onRemove(parameterIndex)}
						className="text-muted-foreground hover:text-destructive select-none h-8"
					>
						<Trash2 className="h-4 w-4 mr-2" />
						Remove
					</Button>
				</div>
			</Card>
		);
	},
	(prevProps, nextProps) => {
		// Only re-render if parameter data or index changes (callbacks are now stable)
		return (
			prevProps.parameter === nextProps.parameter &&
			prevProps.parameterIndex === nextProps.parameterIndex
		);
	}
);
