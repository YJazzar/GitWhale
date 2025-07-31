import React from 'react';
import { backend } from 'wailsjs/go/models';
import { CommitNode } from '@/components/git-log/commit-node';
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

	// Build a graph structure to determine positioning
	const commitMap = new Map<string, backend.GitLogCommitInfo>();
	commits.forEach(commit => commitMap.set(commit.commitHash, commit));

	// Calculate branches and positioning for visual layout
	const branchInfo = calculateBranchLayout(commits);

	return (
		<div className={cn("git-log-graph overflow-auto", className)}>
			<div className="min-w-max">
				{commits.map((commit, index) => {
					const branchData = branchInfo.get(commit.commitHash);
					return (
						<CommitNode
							key={commit.commitHash}
							commit={commit}
							branchColumn={branchData?.column ?? 0}
							connections={branchData?.connections ?? []}
							isFirst={index === 0}
							isLast={index === commits.length - 1}
							onCommitClick={onCommitClick}
							generateCommitPageUrl={generateCommitPageUrl}
						/>
					);
				})}
			</div>
		</div>
	);
}

interface BranchData {
	column: number;
	connections: Connection[];
}

interface Connection {
	fromColumn: number;
	toColumn: number;
	type: 'straight' | 'merge' | 'branch';
}

function calculateBranchLayout(commits: backend.GitLogCommitInfo[]): Map<string, BranchData> {
	const branchInfo = new Map<string, BranchData>();
	const activeBranches: string[] = [];
	
	// Simple layout: assign columns based on first appearance
	commits.forEach((commit, index) => {
		const connections: Connection[] = [];
		let column = 0;
		
		// Check if this commit is a continuation of an existing branch
		let foundExistingBranch = false;
		for (let i = 0; i < activeBranches.length; i++) {
			if (activeBranches[i] === commit.commitHash) {
				column = i;
				foundExistingBranch = true;
				break;
			}
		}
		
		// If not found in active branches, check if it's a child of any active branch
		if (!foundExistingBranch) {
			for (let i = 0; i < activeBranches.length; i++) {
				const activeBranch = activeBranches[i];
				// Check if the current commit is a parent of the active branch
				const nextCommit = commits.find(c => c.commitHash === activeBranch);
				if (nextCommit && nextCommit.parentCommitHashes.includes(commit.commitHash)) {
					column = i;
					activeBranches[i] = commit.commitHash;
					foundExistingBranch = true;
					break;
				}
			}
		}
		
		// If still not found, assign a new column
		if (!foundExistingBranch) {
			column = activeBranches.length;
			activeBranches.push(commit.commitHash);
		}

		// Create connections to parent commits
		commit.parentCommitHashes.forEach((parentHash, parentIndex) => {
			// Find the column of the parent
			const nextCommits = commits.slice(index + 1);
			const parentCommit = nextCommits.find(c => c.commitHash === parentHash);
			if (parentCommit) {
				// We'll determine parent column when we process that commit
				connections.push({
					fromColumn: column,
					toColumn: column, // Will be updated when parent is processed
					type: parentIndex === 0 ? 'straight' : 'merge'
				});
			}
		});

		branchInfo.set(commit.commitHash, {
			column,
			connections
		});
	});

	return branchInfo;
}
