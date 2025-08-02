import React from 'react';
import { backend } from 'wailsjs/go/models';
import { D3GitGraph } from '@/components/git-log/d3-git-graph';
import { cn } from '@/lib/utils';
import { GitBranch } from 'lucide-react';

interface GitLogGraphProps {
	commits: backend.GitLogCommitInfo[];
	onCommitClick?: (commitHash: string) => void;
	generateCommitPageUrl?: (commitHash: string) => string;
	className?: string;
	loading?: boolean;
}

export function GitLogGraph({ 
	commits, 
	onCommitClick, 
	generateCommitPageUrl,
	className,
	loading = false
}: GitLogGraphProps) {
	if (loading) {
		return (
			<div className={cn("flex items-center justify-center h-32", className)}>
				<div className="flex items-center gap-2 text-muted-foreground">
					<GitBranch className="w-4 h-4 animate-pulse" />
					<span>Loading git log...</span>
				</div>
			</div>
		);
	}

	if (!commits || commits.length === 0) {
		return (
			<div className={cn("flex flex-col items-center justify-center h-32 text-muted-foreground", className)}>
				<GitBranch className="w-8 h-8 mb-2 opacity-50" />
				<span>No commits to display</span>
			</div>
		);
	}

	return (
		<div className={cn("git-log-graph overflow-auto w-full", className)}>
			<D3GitGraph 
				commits={commits}
				onCommitClick={onCommitClick}
				className="w-full"
			/>
		</div>
	);
}
