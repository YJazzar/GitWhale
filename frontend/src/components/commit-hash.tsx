import { GitCommit, GitMerge } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';
import { cn } from '@/lib/utils';

interface CommitHashProps {
	commitHash: string;
	isMerge?: boolean;
	className?: string;
	shortHash?: boolean;
	showIcon?: boolean;
	clickable?: boolean;
}

export function CommitHash({ 
	commitHash, 
	isMerge = false, 
	className,
	shortHash = false,
	showIcon = true,
	clickable = true
}: CommitHashProps) {
	const navigate = useNavigate();
	const { encodedRepoPath } = useCurrentRepoParams();

	const displayHash = shortHash ? commitHash.slice(0, 7) : commitHash;
	const commitUrl = `/repo/${encodedRepoPath}/commit/${commitHash}`;

	const handleClick = () => {
		if (clickable) {
			navigate(commitUrl);
		}
	};

	return (
		<div 
			className={cn(
				"flex items-center gap-2",
				clickable && "cursor-pointer hover:opacity-70 transition-opacity",
				className
			)}
			onClick={handleClick}
		>
			{showIcon && (
				isMerge ? (
					<GitMerge className="w-4 h-4 text-primary" />
				) : (
					<GitCommit className="w-4 h-4 text-primary" />
				)
			)}
			<code className="font-mono text-sm bg-muted px-2 py-1 rounded">
				{displayHash}
			</code>
		</div>
	);
}
