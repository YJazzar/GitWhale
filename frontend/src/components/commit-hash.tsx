import { GitCommit, GitMerge, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigateToCommit } from '@/hooks/git-log/use-navigate-to-commit';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useShortHash } from '@/hooks/git-log/use-short-hash';

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
	const [copySuccess, setCopySuccess] = useState(false);
	const displayHash = shortHash ? useShortHash(commitHash) : commitHash;

	const handleViewFullCommit = useNavigateToCommit(repoPath);

	const handleClick = () => {
		if (clickable && repoPath && repoPath.trim() !== '') {
			handleViewFullCommit(commitHash, isMerge);
		}
	};

	const handleCopyHash = async (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent triggering the main click handler
		try {
			await navigator.clipboard.writeText(commitHash);
			setCopySuccess(true);
		} catch (err) {
			console.error('Failed to copy hash to clipboard:', err);
		}
	};

	// Reset copy success state after 2 seconds
	useEffect(() => {
		if (copySuccess) {
			const timer = setTimeout(() => {
				setCopySuccess(false);
			}, 800);
			return () => clearTimeout(timer);
		}
	}, [copySuccess]);

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
				<Button
					variant="ghost"
					size="sm"
					className={cn(
						'h-6 w-6 p-0 transition-colors duration-200',
						copySuccess
							? 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400'
							: 'hover:bg-muted-foreground/10'
					)}
					onClick={handleCopyHash}
					title={copySuccess ? 'Copied to clipboard!' : 'Copy full commit hash'}
				>
					{copySuccess ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
				</Button>
			)}
		</div>
	);
}
