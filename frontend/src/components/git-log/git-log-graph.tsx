import { D3GitGraph } from '@/components/git-log/d3-git-graph';
import { useRepoState } from '@/hooks/state/use-repo-state';
import { cn } from '@/lib/utils';
import { GitBranch } from 'lucide-react';
import { git_operations } from 'wailsjs/go/models';

interface GitLogGraphProps {
	repoPath: string;
	onCommitClick: (commitHash: string, shouldAddToSelection: boolean) => void;
	onCommitDoubleClick: (commitHash: string) => void;
	className?: string;
}

export function GitLogGraph({ repoPath, onCommitClick, onCommitDoubleClick, className }: GitLogGraphProps) {
	const { logState } = useRepoState(repoPath);
	const commits = logState.logs;
	const isLoading = logState.isLoading;

	if (isLoading) {
		return (
			<div className={cn('flex items-center justify-center h-32', className)}>
				<div className="flex items-center gap-2 text-muted-foreground">
					<GitBranch className="w-4 h-4 animate-pulse" />
					<span>Loading git log...</span>
				</div>
			</div>
		);
	}

	if (!commits || commits.length === 0) {
		return (
			<div
				className={cn(
					'flex flex-col items-center justify-center h-32 text-muted-foreground',
					className
				)}
			>
				<GitBranch className="w-8 h-8 mb-2 opacity-50" />
				<span>No commits to display</span>
			</div>
		);
	}

	return (
		<div className={cn('git-log-graph overflow-auto w-full', className)}>
			<D3GitGraph
				commits={commits}
				onCommitClick={onCommitClick}
				onCommitDoubleClick={onCommitDoubleClick}
				className="w-full"
				selectedCommitHashes={logState.selectedCommits.currentSelectedCommits}
			/>
		</div>
	);
}
