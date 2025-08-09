import { GitCommit, GitMerge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigateToCommit } from '@/hooks/use-navigate-to-commit';

interface CommitHashProps {
	commitHash: string;
	isMerge?: boolean;
	className?: string;
	shortHash?: boolean;
	showIcon?: boolean;
	clickable?: boolean;
	repoPath: string; // Optional override for repoPath
}

export function CommitHash({
	commitHash,
	isMerge = false,
	className,
	shortHash = false,
	showIcon = true,
	clickable = true,
	repoPath,
}: CommitHashProps) {
	const displayHash = shortHash ? commitHash.slice(0, 7) : commitHash;

	const handleViewFullCommit = useNavigateToCommit(repoPath);

	const handleClick = () => {
		if (clickable && repoPath && repoPath.trim() !== '') {
			handleViewFullCommit(commitHash, isMerge);
		}
	};

	const isActuallyClickable = clickable && repoPath && repoPath.trim() !== '';

	return (
		<div
			className={cn(
				'flex items-center gap-2',
				isActuallyClickable && 'cursor-pointer hover:opacity-70 transition-opacity',
				className
			)}
			onClick={handleClick}
		>
			{showIcon &&
				(isMerge ? (
					<GitMerge className="w-4 h-4 text-primary" />
				) : (
					<GitCommit className="w-4 h-4 text-primary" />
				))}
			<code className="font-mono text-sm bg-muted px-2 py-1 rounded">{displayHash}</code>
		</div>
	);
}
