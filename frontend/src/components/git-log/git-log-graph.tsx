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
	const branchInfo = calculateAdvancedBranchLayout(commits);

	return (
		<div className={cn("git-log-graph overflow-auto w-full", className)}>
			<div className="min-w-max w-full">
				{commits.map((commit, index) => {
					const branchData = branchInfo.get(commit.commitHash);
					return (
						<CommitNode
							key={commit.commitHash}
							commit={commit}
							branchColumn={branchData?.column ?? 0}
							connections={branchData?.connections ?? []}
							incomingConnections={branchData?.incomingConnections ?? []}
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
	incomingConnections: Connection[];
}

interface Connection {
	fromColumn: number;
	toColumn: number;
	type: 'straight' | 'merge' | 'branch';
	color: string;
}


function calculateAdvancedBranchLayout(commits: backend.GitLogCommitInfo[]): Map<string, BranchData> {
	const branchInfo = new Map<string, BranchData>();
	
	const branchColors = [
		'#3b82f6', // blue
		'#10b981', // emerald  
		'#f59e0b', // amber
		'#ef4444', // red
		'#8b5cf6', // violet
		'#06b6d4', // cyan
		'#f97316', // orange
		'#84cc16', // lime
		'#ec4899', // pink
		'#6366f1'  // indigo
	];
	
	// Much simpler approach: assign all commits to column 0 initially
	// Only create new columns when we actually need them for merges
	const commitColumns = new Map<string, { column: number; color: string }>();
	let nextColorIndex = 0;
	
	// First pass: assign columns based on parent relationships
	commits.forEach((commit) => {
		const parentHashes = commit.parentCommitHashes.filter(hash => hash.trim() !== '');
		
		let assignedColumn = 0; // Default to column 0 for linear history
		let assignedColor = branchColors[0]; // Default to first color
		
		if (parentHashes.length === 0) {
			// Root commit - column 0
			assignedColumn = 0;
			assignedColor = branchColors[0];
		} else if (parentHashes.length === 1) {
			// Single parent - ALWAYS use parent's column (this ensures linear history stays straight)
			const parentInfo = commitColumns.get(parentHashes[0]);
			if (parentInfo) {
				assignedColumn = parentInfo.column;
				assignedColor = parentInfo.color;
			} else {
				// Parent not found, default to column 0
				assignedColumn = 0;
				assignedColor = branchColors[0];
			}
		} else {
			// Merge commit - use primary parent's column
			const primaryParentInfo = commitColumns.get(parentHashes[0]);
			if (primaryParentInfo) {
				assignedColumn = primaryParentInfo.column;
				assignedColor = primaryParentInfo.color;
			} else {
				assignedColumn = 0;
				assignedColor = branchColors[0];
			}
			
			// Ensure secondary parents have columns assigned
			parentHashes.slice(1).forEach(parentHash => {
				if (!commitColumns.has(parentHash)) {
					nextColorIndex++;
					commitColumns.set(parentHash, {
						column: nextColorIndex,
						color: branchColors[nextColorIndex % branchColors.length]
					});
				}
			});
		}
		
		commitColumns.set(commit.commitHash, {
			column: assignedColumn,
			color: assignedColor
		});
	});
	
	// Second pass: create connections
	commits.forEach((commit) => {
		const commitInfo = commitColumns.get(commit.commitHash)!;
		const parentHashes = commit.parentCommitHashes.filter(hash => hash.trim() !== '');
		
		const connections: Connection[] = [];
		
		parentHashes.forEach((parentHash, parentIndex) => {
			const parentInfo = commitColumns.get(parentHash);
			if (!parentInfo) return;
			
			const connectionType = parentIndex === 0 ? 'straight' : 'merge';
			const connectionColor = parentIndex === 0 ? commitInfo.color : parentInfo.color;
			
			connections.push({
				fromColumn: commitInfo.column,
				toColumn: parentInfo.column,
				type: connectionType,
				color: connectionColor
			});
		});
		
		branchInfo.set(commit.commitHash, {
			column: commitInfo.column,
			connections,
			incomingConnections: []
		});
	});
	
	// Third pass: calculate incoming connections
	commits.forEach(commit => {
		const commitData = branchInfo.get(commit.commitHash)!;
		
		commit.parentCommitHashes.forEach(parentHash => {
			if (parentHash.trim() === '') return;
			
			const parentData = branchInfo.get(parentHash);
			if (parentData) {
				// Find the connection from commit to this parent
				const connection = commitData.connections.find(conn => {
					const parentInfo = commitColumns.get(parentHash);
					return parentInfo && conn.toColumn === parentInfo.column;
				});
				
				if (connection) {
					parentData.incomingConnections.push(connection);
				}
			}
		});
	});

	return branchInfo;
}
