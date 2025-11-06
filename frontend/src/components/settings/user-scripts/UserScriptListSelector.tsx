import { ShellCommand } from '@/components/shell-command';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useCallback } from 'react';
import { backend } from '../../../../wailsjs/go/models';

interface UserScriptListSelectorProps {
	onToggleScriptId: (scriptId: string, newToggleState: boolean) => void;
	userScriptCommands: backend.UserDefinedCommandDefinition[];
	selectedUserScriptIds: Set<string>;
}

export function UserScriptListSelector(props: UserScriptListSelectorProps) {
	const { onToggleScriptId, userScriptCommands, selectedUserScriptIds } = props;

	const onToggleUserScript = useCallback(
		(userScriptId: string) => {
			const wasPreviouslyCheck = selectedUserScriptIds.has(userScriptId);
			onToggleScriptId(userScriptId, !wasPreviouslyCheck);
		},
		[onToggleScriptId, selectedUserScriptIds]
	);

	return (
		<>
			{userScriptCommands.map((userScript: backend.UserDefinedCommandDefinition) => (
				<div
					key={userScript.id}
					onClick={() => onToggleUserScript(userScript.id)}
					className="p-2 rounded-md hover:bg-muted/50 transition-colors space-y-2 select-none"
				>
					{/* First line: Checkbox, Title, Context Badge, Description */}
					<div className="flex items-center gap-2">
						<Checkbox
							checked={selectedUserScriptIds.has(userScript.id)}
							className="flex-shrink-0"
						/>
						<h4 className="font-medium text-sm truncate">{userScript.title}</h4>
						<Badge variant="outline" className="text-xs px-2 py-0 flex-shrink-0">
							{userScript.context}
						</Badge>
						{userScript.description && (
							<span className="text-xs text-muted-foreground truncate">
								• {userScript.description}
							</span>
						)}
					</div>

					{/* Second line: Command String aligned with checkbox */}
					<ShellCommand commandString={userScript.action.commandString} truncateCommand={true} />
				</div>
			))}
		</>
	);
}
