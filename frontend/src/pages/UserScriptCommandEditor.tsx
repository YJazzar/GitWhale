import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { UserScriptEditorBasicInfoForm } from '@/components/user-script-editor/user-script-editor-basic-info-form';
import { UserScriptEditorActionButtons } from '@/components/user-script-editor/user-script-editor-command-actions';
import { UserScriptEditorParameterSection } from '@/components/user-script-editor/user-script-editor-parameter-section';
import { useUserScriptEditorState } from '@/hooks/command-palette/use-user-script-editor-state';
import { Terminal } from 'lucide-react';

interface UserScriptCommandEditorProps {
	// A unique session key to use for this editor (so that we can easily support multiple editors for new commands)
	sessionKey: string;

	// Is assumed to stay as-is, even if the command's ID gets saved to something different
	originalCommandId?: string;
}

export default function UserScriptCommandEditor({
	sessionKey,
	originalCommandId,
}: UserScriptCommandEditorProps) {
	const editorState = useUserScriptEditorState(sessionKey, originalCommandId);

	return (
		<div className="container mx-auto max-w-4xl pb-4">
			<div className="flex items-center gap-3 p-4">
				<Terminal className="h-6 w-6" />
				<h1 className="text-2xl font-bold">
					{originalCommandId ? 'Edit User Script' : 'Create User Script'}
				</h1>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Command Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<UserScriptEditorBasicInfoForm
						formData={editorState.formData}
						errors={editorState.errors || {}}
						updateFormField={editorState.updateFormField}
					/>
					<Separator />
					<UserScriptEditorParameterSection
						parameters={editorState.formData.parameters}
						addParameter={editorState.addParameter}
						updateParameter={editorState.updateParameter}
						removeParameter={editorState.removeParameter}
					/>
					<Separator />
					<UserScriptEditorActionButtons
						originalCommandId={originalCommandId}
						isLoading={editorState.isLoading || false}
						onDelete={editorState.handleDelete}
						onCancel={editorState.handleCancel}
						onSave={editorState.handleSave}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
