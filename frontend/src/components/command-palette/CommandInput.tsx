import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
	CommandPaletteContextKey,
	RepoCommandPaletteContextData,
	useCommandPaletteState,
} from '@/hooks/command-palette/use-command-palette-state';
import { CommandIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';

export function CommandInput() {
	const commandPaletteState = useCommandPaletteState();

	const searchQuery = commandPaletteState.searchQuery;
	const inputRef = useRef<HTMLInputElement>(null);

	// Focus input when component mounts
	useEffect(() => {
		if (inputRef.current) {
			inputRef.current.focus();
		}
	}, []);

	const handleSubmit = async () => {};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSubmit();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			commandPaletteState.isActive.set(false);
		}
	};

	const repoContextData = commandPaletteState.availableContexts.getByKey(CommandPaletteContextKey.Repo) as
		| RepoCommandPaletteContextData
		| undefined;

	return (
		<div className="flex flex-col h-full">
			<div className="relative">
				<CommandIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
				<Input
					ref={inputRef}
					value={searchQuery.get()}
					onChange={(e) => searchQuery.set(e.target.value)}
					placeholder="Type a command or search..."
					className="pl-10 text-sm"
					onKeyDown={handleKeyDown}
				/>

				{!!repoContextData && (
					<div className="mt-2 flex items-center gap-2">
						<Badge variant="secondary" className="text-xs">
							Repository: {repoContextData.repoPath.split('/').pop()}
						</Badge>
					</div>
				)}

				{/* Collected Parameters Display */}
				{/* {Object.keys(collectedParams).length > 0 && (
					<div className="pt-4 border-t">
						<h4 className="text-xs font-medium text-muted-foreground mb-2">
							Collected Parameters:
						</h4>
						<div className="flex flex-wrap gap-2">
							{Object.entries(collectedParams).map(([key, value]) => (
								<Badge key={key} variant="secondary" className="text-xs">
									{key}: {value}
								</Badge>
							))}
						</div>
					</div>
				)} */}
			</div>

			{/* Footer */}
			<div className="p-4 border-t bg-muted/30">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<span>↵ to continue</span>
						<span>Esc to cancel</span>
					</div>
					{/* <div className="flex items-center gap-2">
						{parameterIndex > 0 && (
							<Button variant="outline" size="sm">
								<ArrowLeft className="h-4 w-4 mr-1" />
								Back
							</Button>
						)}
						<Button onClick={handleSubmit} size="sm">
							{parameterIndex < totalParams - 1 ? (
								<>
									Next
									<ArrowRight className="h-4 w-4 ml-1" />
								</>
							) : (
								'Execute'
							)}
						</Button>
					</div> */}
				</div>
			</div>
		</div>
	);
}
