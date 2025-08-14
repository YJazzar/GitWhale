import { GitCommit, GitMerge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigateToCommit } from '@/hooks/navigation/use-navigate-to-commit';
import { useShortHash } from '@/hooks/git-log/use-short-hash';
import { CopyButton } from '@/components/ui/copy-button';

interface CommitHashProps {
	commitHash: string;
	isMerge?: boolean;
	className?: string;
	shortHash?: boolean;
	showIcon?: boolean;
	clickable?: boolean;
	repoPath: string; // Optional override for repoPath
	enableCopyHash?: boolean;
}

export function CommitHash({
	commitHash,
	isMerge = false,
	className,
	shortHash = false,
	showIcon = true,
	clickable = true,
	repoPath,
	enableCopyHash = false,
}: CommitHashProps) {
	const displayHash = shortHash ? useShortHash(commitHash) : commitHash;

	const handleViewFullCommit = useNavigateToCommit(repoPath);

	const handleClick = () => {
		if (clickable && repoPath && repoPath.trim() !== '') {
			handleViewFullCommit(commitHash, isMerge);
		}
	};

	const isActuallyClickable = clickable && repoPath && repoPath.trim() !== '';

	return (
		<div className={cn('flex items-center gap-2', className)}>
			{showIcon &&
				(isMerge ? (
					<GitMerge className="w-4 h-4 text-primary" />
				) : (
					<GitCommit className="w-4 h-4 text-primary" />
				))}
				
			<code
				className={cn(
					'font-mono text-sm bg-muted px-2 py-1 rounded',
					isActuallyClickable && 'cursor-pointer hover:opacity-70 transition-opacity',
					className
				)}
				onClick={handleClick}
			>
				{displayHash}
			</code>

			{enableCopyHash && (
				<CopyButton
					text={commitHash}
					title="Copy full commit hash"
					successTitle="Copied to clipboard!"
				/>
			)}
		</div>
	);
}
