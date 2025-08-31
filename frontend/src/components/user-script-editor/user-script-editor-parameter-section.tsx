import { UserDefinedParameter } from '@/hooks/command-palette/use-user-script-command';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';
import { UserScriptEditorParameterForm } from './user-script-editor-parameter-form';

interface UserScriptEditorParameterSectionProps {
	parameters?: UserDefinedParameter[];
	addParameter: () => void;
	updateParameter: <T extends UserDefinedParameter, K extends keyof T>(
		index: number,
		paramField: K,
		value: T[K]
	) => void;
	removeParameter: (index: number) => void;
}

export function UserScriptEditorParameterSection({
	parameters,
	addParameter,
	updateParameter,
	removeParameter,
}: UserScriptEditorParameterSectionProps) {
	return (
		<div>
			<div className="flex items-center justify-between mb-3">
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

			{parameters && parameters.length > 0 ? (
				<div className="space-y-1">
					{parameters.map((param, index) => (
						<UserScriptEditorParameterForm
							key={index}
							parameter={param}
							parameterIndex={index}
							onUpdate={updateParameter}
							onRemove={removeParameter}
						/>
					))}
				</div>
			) : (
				<div className="text-center py-2 text-muted-foreground">
					<div className="text-sm">No parameters defined</div>
					<div className="text-xs">Parameters allow users to provide input to your command</div>
				</div>
			)}
		</div>
	);
}
