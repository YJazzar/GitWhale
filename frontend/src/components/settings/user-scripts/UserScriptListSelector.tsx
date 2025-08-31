import { ShellCommand } from '@/components/shell-command';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCallback } from 'react';
import { backend } from '../../../../wailsjs/go/models';

interface UserScriptListSelectorProps {
	onToggleScriptId: (scriptId: string, newToggleState: boolean) => void;
	userScriptCommands: backend.UserDefinedCommandDefinition[];
	selectedUserScriptIds: Set<string>;
}

export function UserScriptListSelector(props: UserScriptListSelectorProps) {
	const { onToggleScriptId, userScriptCommands, selectedUserScriptIds } = props;

	const onToggleUserScriptCallbackFactory = useCallback(
		(userScriptId: string) => {
			return (checked: boolean) => {
				onToggleScriptId(userScriptId, !!checked);
			};
		},
		[onToggleScriptId]
	);

	return (
		<>
			{/* User Scripts List */}
			<ScrollArea className="h-80 rounded-md">
				<div className="p-4 space-y-3">
					{userScriptCommands.map((userScript: backend.UserDefinedCommandDefinition) => (
						<div
							key={userScript.id}
							className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
						>
							<Checkbox
								checked={selectedUserScriptIds.has(userScript.id)}
								onCheckedChange={onToggleUserScriptCallbackFactory(userScript.id)}
								className="mt-1"
							/>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 mb-1">
									<h4 className="font-medium text-sm truncate">{userScript.title}</h4>
									<Badge variant="secondary" className="text-xs">
										{userScript.context}
									</Badge>
								</div>
								{userScript.description && (
									<p className="text-xs text-muted-foreground mb-2 truncate">
										{userScript.description}
									</p>
								)}
								<div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">

									<ShellCommand
										commandString={userScript.action.commandString}
									/>
								</div>
							</div>
						</div>
					))}
				</div>
			</ScrollArea>
		</>
	);
}
