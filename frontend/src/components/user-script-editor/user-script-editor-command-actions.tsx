import { Save, Trash2 } from "lucide-react";
import { ConfirmDeleteButton } from "../ui/confirm-delete-button";
import { Button } from "../ui/button";

interface UserScriptEditorActionButtonsProps {
	originalCommandId?: string;
	isLoading: boolean;
	onDelete: () => void;
	onCancel: () => void;
	onSave: () => void;
}

export function UserScriptEditorActionButtons({ 
	originalCommandId, 
	isLoading, 
	onDelete, 
	onCancel, 
	onSave 
}: UserScriptEditorActionButtonsProps) {
	return (
		<div className="flex justify-between">
			<div>
				{originalCommandId && (
					<ConfirmDeleteButton onDelete={onDelete} disabled={isLoading}>
						<Trash2 className="h-4 w-4 mr-2" />
						Delete Command
					</ConfirmDeleteButton>
				)}
			</div>

			<div className="flex gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isLoading}
					className="select-none"
				>
					Cancel
				</Button>
				<Button onClick={onSave} disabled={isLoading} className="select-none">
					<Save className="h-4 w-4 mr-2" />
					{isLoading ? 'Saving...' : 'Save Command'}
				</Button>
			</div>
		</div>
	);
}