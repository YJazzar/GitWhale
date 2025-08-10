import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { GitBranch, ChevronDown, GitCommitHorizontal, Tag } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '@radix-ui/react-dropdown-menu';

interface LabeledRefSelectorInputProps {
	repoPath: string;
	label: string;
	currentGitRef: string;
	onUpdateGitRef: (newRefName: string) => void;
}

export function LabeledRefSelectorInput({ repoPath, label, currentGitRef, onUpdateGitRef }: LabeledRefSelectorInputProps) {
	return <div className={'flex items-center gap-3'}>
		<Label className={'text-sm font-medium whitespace-nowrap'}>{label}</Label>
		<RefSelectorInput repoPath={repoPath} currentGitRef={currentGitRef} onUpdateGitRef={onUpdateGitRef} />
	</div>;
}

interface RefSelectorInputProps {
	repoPath: string;
	currentGitRef: string;
	onUpdateGitRef: (newRefName: string) => void;
}

export function RefSelectorInput({ repoPath, currentGitRef, onUpdateGitRef }: RefSelectorInputProps) {
	const { logState } = useRepoState(repoPath);
	const isLoadingLogs = logState.isLoading;

	const allRepoRefs = logState.refs ?? [];
	const localBranches = allRepoRefs.filter((b) => b.type === 'localBranch');
	const remoteBranches = allRepoRefs.filter((b) => b.type === 'remoteBranch');
	const tags = allRepoRefs.filter((b) => b.type === 'tag');

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button className="flex" variant="outline" size="sm" disabled={isLoadingLogs}>
					<GitBranch className="w-4 h-4 mr-2" />
					<span className='flex-grow'>{currentGitRef}</span>
					<ChevronDown className="w-4 h-4 ml-2" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-64" sideOffset={8}>
				<DropdownMenuItem onClick={() => onUpdateGitRef('HEAD')}>
					<GitCommitHorizontal className="w-4 h-4 mr-2" />
					<span>HEAD</span>
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				{localBranches.length > 0 && (
					<>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<GitBranch className="w-4 h-4 mr-2" />
								Local Branches
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								{localBranches.map((branch) => (
									<DropdownMenuItem
										key={branch.name}
										onClick={() => onUpdateGitRef(branch.name)}
									>
										<span>{branch.name}</span>
									</DropdownMenuItem>
								))}
							</DropdownMenuSubContent>
						</DropdownMenuSub>
						<DropdownMenuSeparator />
					</>
				)}

				{remoteBranches.length > 0 && (
					<>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<GitBranch className="w-4 h-4 mr-2" />
								Remote Branches
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								{remoteBranches.map((branch) => (
									<DropdownMenuItem
										key={branch.name}
										onClick={() => onUpdateGitRef(branch.name)}
									>
										{branch.name}
									</DropdownMenuItem>
								))}
							</DropdownMenuSubContent>
						</DropdownMenuSub>
						<DropdownMenuSeparator />
					</>
				)}

				{tags.length > 0 && (
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<Tag className="w-4 h-4 mr-2" />
							Tags
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							{tags.slice(0, 20).map((tag) => (
								<DropdownMenuItem key={tag.name} onClick={() => onUpdateGitRef(tag.name)}>
									{tag.name}
								</DropdownMenuItem>
							))}
							{tags.length > 20 && (
								<DropdownMenuItem disabled>... and {tags.length - 20} more</DropdownMenuItem>
							)}
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
