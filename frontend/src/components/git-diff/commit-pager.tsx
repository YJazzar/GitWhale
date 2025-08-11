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

	const hasMultipleParents = commitData.parentCommitHashes.length > 1;
	const hasParents = commitData.parentCommitHashes.length > 0;

	// Navigation state
	const hasNext = !!commitData.nextCommitHash;

	// Handlers
	const handlePreviousClick = (parentHash: string) => {
		navigateToCommitDiff(parentHash, undefined);
	};

	const handleNextClick = () => {
		navigateToCommitDiff(commitData.nextCommitHash, undefined);
	};

	// Previous Button - Simple or Dropdown based on parent count
	let previousButton;
	if (!hasParents) {
		// No parents - disabled button
		previousButton = (
			<Button
				variant={'link'}
				size={'sm'}
				disabled={true}
				className="text-xs px-2 opacity-50 cursor-not-allowed hover:text-muted-foreground"
			>
				Previous
			</Button>
		);
	} else if (!hasMultipleParents) {
		// Single parent - simple button
		previousButton = (
			<Button
				variant={'link'}
				size={'sm'}
				onClick={() => handlePreviousClick(commitData.parentCommitHashes[0])}
				className="text-xs px-2 text-foreground hover:text-primary"
			>
				Previous
			</Button>
		);
	} else {
		// Multiple parents - dropdown menu
		previousButton = (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant={'link'}
						size={'sm'}
						className="text-xs px-1 text-foreground hover:text-primary flex items-center gap-1"
					>
						Previous
						<ChevronDown className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-56">
					<DropdownMenuLabel className="flex items-center gap-2">
						<GitMerge className="h-3 w-3" />
						Choose Parent Commit
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{commitData.parentCommitHashes.map((parentHash, index) => (
						<DropdownMenuItem
							key={parentHash}
							onClick={() => handlePreviousClick(parentHash)}
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
										isMerge={hasMultipleParents}
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
				{previousButton}
				<div className="flex-grow" />

				{/* Next Button */}
				<Button
					variant={'link'}
					size={'sm'}
					disabled={!hasNext}
					onClick={hasNext ? handleNextClick : undefined}
					className={cn(
						'text-xs px-2 text-foreground hover:text-primary',
						!hasNext && 'opacity-50 cursor-not-allowed hover:text-muted-foreground'
					)}
				>
					Next
				</Button>
			</div>
		</div>
	);
}
