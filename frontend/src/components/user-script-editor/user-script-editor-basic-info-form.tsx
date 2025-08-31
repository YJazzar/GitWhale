import { CommandPaletteContextKey } from "@/types/command-palette";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { TagInput } from "../ui/tag-input";
import { UserDefinedCommandDefinition } from "@/hooks/command-palette/use-user-script-command";

interface UserScriptEditorBasicInfoFormProps {
	formData: Partial<UserDefinedCommandDefinition>;
	errors: Record<string, string>;
	updateFormField: <T extends UserDefinedCommandDefinition, K extends keyof T>(key: K, value: T[K]) => void;
}

export function UserScriptEditorBasicInfoForm({ formData, errors, updateFormField }: UserScriptEditorBasicInfoFormProps) {
	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<Label htmlFor="title">Title *</Label>
					<Input
						id="title"
						value={formData.title || ''}
						onChange={(e) => updateFormField('title', e.target.value)}
						placeholder="Git: My custom user script"
						className={errors.title ? 'border-destructive' : ''}
					/>
					{errors.title && <div className="text-sm text-destructive mt-1">{errors.title}</div>}
				</div>

				<div>
					<Label htmlFor="context">Context *</Label>
					<Select
						value={formData.context || ''}
						onValueChange={(value) =>
							updateFormField('context', value as CommandPaletteContextKey)
						}
					>
						<SelectTrigger className={'w-full ' + (errors.context ? 'border-destructive' : '')}>
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
