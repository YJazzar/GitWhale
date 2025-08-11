import { cn } from '@/lib/utils';
import { git_operations } from '../../../wailsjs/go/models';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useUnixTime } from '@/hooks/use-unix-time';
import { User, Calendar, Hash } from 'lucide-react';
import { CommitHash } from '../commit-hash';

interface CommitPagerProps {
	repoPath: string;
	commitData: git_operations.DetailedCommitInfo;
	className?: string;
}

export function CommitPager(props: CommitPagerProps) {
	const { repoPath, commitData, className } = props;

	// Process commit message - join array and get first line for truncation
	const fullMessage = Array.isArray(commitData.commitMessage)
		? commitData.commitMessage.join('\n')
		: commitData.commitMessage || '';
	const truncatedMessage = fullMessage.split('\n')[0] || '';

	// Format commit date
	const commitDate = useUnixTime(commitData.commitTimeStamp);

	const hasMultipleParents = commitData.parentCommitHashes.length > 1

	// Navigation state
	const hasPrevious = !!commitData.prevCommitHash;
	const hasNext = !!commitData.nextCommitHash;

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
										className='text-xs'
									/>
								</div>
							</div>
						</div>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<div className="flex mt-2">
				<Button
					variant={'link'}
					size={'sm'}
					disabled={!hasPrevious}
					className={cn(
						'text-xs px-2 text-foreground hover:text-primary',
						!hasPrevious && 'opacity-50 cursor-not-allowed hover:text-muted-foreground'
					)}
				>
					Previous
				</Button>
				<div className="flex-grow" />
				<Button
					variant={'link'}
					size={'sm'}
					disabled={!hasNext}
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
