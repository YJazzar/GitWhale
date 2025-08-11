import { cn } from '@/lib/utils';
import { git_operations } from '../../../wailsjs/go/models';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useUnixTime } from '@/hooks/use-unix-time';
import { User, Calendar, Hash, ChevronDown, GitMerge, GitCommit } from 'lucide-react';
import { CommitHash } from '../commit-hash';
import { useNavigateToCommitDiffs } from '@/hooks/git-diff/use-navigate-commit-diffs';

interface CommitPagerProps {
	repoPath: string;
	commitData: git_operations.DetailedCommitInfo;
	className?: string;
}

export function CommitPager(props: CommitPagerProps) {
	const { repoPath, commitData, className } = props;
	const { navigateToCommitDiff } = useNavigateToCommitDiffs(repoPath);

	// Process commit message - join array and get first line for truncation
	const fullMessage = Array.isArray(commitData.commitMessage)
		? commitData.commitMessage.join('\n')
		: commitData.commitMessage || '';
	const truncatedMessage = fullMessage.split('\n')[0] || '';

	// Format commit date
	const commitDate = useUnixTime(commitData.commitTimeStamp);

	const handleOpenNewDiff = (commitHash: string) => {
		navigateToCommitDiff(commitHash, undefined);
	};

	return (
		<div className={cn('text-xs p-2', className)}>
			<TooltipProvider>
				<Tooltip delayDuration={50}>
					<TooltipTrigger asChild>
						<code className="block rounded font-mono text-xs truncate hover:text-primary transition-colors text-foreground">
							{truncatedMessage}
						</code>
					</TooltipTrigger>
					<TooltipContent
						side="top"
						className="max-w-md p-3 bg-popover border border-border shadow-lg drop-shadow-xl"
					>
						<div className="space-y-2">
							{/* Full commit message */}
							<div className="text-sm font-medium text-popover-foreground">
								<pre className="whitespace-pre-wrap font-mono text-xs text-popover-foreground">
									{fullMessage}
								</pre>
							</div>

							<div className="border-t border-border pt-2 space-y-1">
								{/* Author info */}
								<div className="flex items-center gap-2 text-xs text-popover-foreground">
									<User className="h-3 w-3 text-muted-foreground" />
									<span>{commitData.username}</span>
									<span className="text-muted-foreground">({commitData.userEmail})</span>
								</div>

								{/* Date info */}
								<div className="flex items-center gap-2 text-xs text-popover-foreground">
									<Calendar className="h-3 w-3 text-muted-foreground" />
									<span>
										{commitDate.toLocaleDateString()} at {commitDate.toLocaleTimeString()}
									</span>
								</div>

								{/* Hash info */}
								<div className="flex items-center gap-2 text-xs text-popover-foreground">
									<Hash className="h-3 w-3 text-muted-foreground" />
									<CommitHash
										commitHash={commitData.commitHash}
										shortHash
										repoPath={repoPath}
										enableCopyHash
										isMerge={commitData.parentCommitHashes.length > 0}
										showIcon={false}
										className="text-xs"
									/>
								</div>
							</div>
						</div>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<div className="flex mt-2">
				{/* Previous Button */}
				<PagingButton onClick={handleOpenNewDiff} commitHashes={commitData.parentCommitHashes} buttonText='Previous' />

				<div className="flex-grow" />

				{/* Next Button */}
				<PagingButton onClick={handleOpenNewDiff} commitHashes={commitData.childHashes} buttonText='Next'/>
			</div>
		</div>
	);
}

interface PagingButtonProps {
	commitHashes: string[];
	onClick: (commitHash: string) => void;
	buttonText: string;
}

// Button - Simple or Dropdown based on commit count
function PagingButton(props: PagingButtonProps) {
	const { commitHashes, onClick, buttonText} = props;
	const hasMultipleParents = commitHashes.length > 1;
	const hasParents = commitHashes.length > 0;

	if (!hasParents) {
		// No pareents - disabled button
		return (
			<Button
				variant={'link'}
				size={'sm'}
				disabled={true}
				className="text-xs px-2 opacity-50 cursor-not-allowed hover:text-muted-foreground"
			>
				{buttonText}
			</Button>
		);
	} else if (!hasMultipleParents) {
		// Single parent - simple button
		return (
			<Button
				variant={'link'}
				size={'sm'}
				onClick={() => onClick(commitHashes[0])}
				className="text-xs px-2 text-foreground hover:text-primary"
			>
				{buttonText}
			</Button>
		);
	} else {
		// Multiple parents - dropdown menu
		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant={'link'}
						size={'sm'}
						className="text-xs px-1 text-foreground hover:text-primary flex items-center gap-1"
					>
						{buttonText}
						<ChevronDown className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-56">
					{commitHashes.map((parentHash, index) => (
						<DropdownMenuItem
							key={parentHash}
							onClick={() => onClick(parentHash)}
							className="flex items-center gap-2"
						>
							<GitCommit className="h-3 w-3" />
							<div className="flex flex-col">
								<span className="font-mono text-xs">{parentHash.substring(0, 7)}</span>
								<span className="text-xs text-muted-foreground">Parent {index + 1}</span>
							</div>
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}
}
