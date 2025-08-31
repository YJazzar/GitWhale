import { UserDefinedCommandDefinition } from '@/hooks/command-palette/use-user-script-command';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface UserScriptEditorScriptInputProps {
	formData: Partial<UserDefinedCommandDefinition>;
	errors: Record<string, string>;
	updateFormField: <T extends UserDefinedCommandDefinition, K extends keyof T>(key: K, value: T[K]) => void;
}

export function UserScriptEditorScriptInput({
	formData,
	errors,
	updateFormField,
}: UserScriptEditorScriptInputProps) {
	return (
		<>
			<div>
				<Label htmlFor="commandString">Shell script *</Label>
				<Input
					id="commandString"
					value={formData.action?.commandString || ''}
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
	);
}
