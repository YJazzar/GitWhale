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
	
	// Track active lanes - each lane represents a branch line
	const lanes: Array<string | null> = []; // commitHash currently in each lane, null if empty
	const commitColumns = new Map<string, { column: number; color: string }>();
	let nextColorIndex = 0;
	
	commits.forEach((commit, commitIndex) => {
		const parentHashes = commit.parentCommitHashes.filter(hash => hash.trim() !== '');
		
		let assignedColumn = -1;
		let assignedColor = '';
		
		// Find if this commit should continue an existing lane
		if (parentHashes.length > 0) {
			// Look for the primary parent in existing lanes
			const primaryParent = parentHashes[0];
			for (let laneIndex = 0; laneIndex < lanes.length; laneIndex++) {
				if (lanes[laneIndex] === primaryParent) {
					assignedColumn = laneIndex;
					const parentInfo = commitColumns.get(primaryParent);
					assignedColor = parentInfo?.color || branchColors[laneIndex % branchColors.length];
					break;
				}
			}
		}
		
		// If no existing lane found, assign a new one
		if (assignedColumn === -1) {
			// Find the first available lane
			assignedColumn = lanes.findIndex(lane => lane === null);
			if (assignedColumn === -1) {
				// No empty lane, create a new one
				assignedColumn = lanes.length;
				lanes.push(null);
			}
			assignedColor = branchColors[nextColorIndex % branchColors.length];
			nextColorIndex++;
		}
		
		// Place this commit in the assigned lane
		lanes[assignedColumn] = commit.commitHash;
		
		commitColumns.set(commit.commitHash, {
			column: assignedColumn,
			color: assignedColor
		});
		
		// For merge commits, ensure all parents have columns assigned
		if (parentHashes.length > 1) {
			parentHashes.slice(1).forEach(parentHash => {
				if (!commitColumns.has(parentHash)) {
					// Find if this parent is in any future commits (to assign it a proper lane)
					const futureCommits = commits.slice(commitIndex + 1);
					const parentInFuture = futureCommits.find(c => c.commitHash === parentHash);
					
					if (parentInFuture) {
						// This parent will appear later, assign it a lane
						let parentLane = lanes.findIndex(lane => lane === null);
						if (parentLane === -1) {
							parentLane = lanes.length;
							lanes.push(null);
						}
						lanes[parentLane] = parentHash;
						
						commitColumns.set(parentHash, {
							column: parentLane,
							color: branchColors[nextColorIndex % branchColors.length]
						});
						nextColorIndex++;
					}
				}
			});
		}
		
		// Clean up lanes that are no longer needed
		const remainingCommits = commits.slice(commitIndex + 1);
		for (let laneIndex = 0; laneIndex < lanes.length; laneIndex++) {
			const laneCommit = lanes[laneIndex];
			if (laneCommit && laneCommit !== commit.commitHash) {
				// Check if this lane's commit has any children in remaining commits
				const hasChildren = remainingCommits.some(futureCommit =>
					futureCommit.parentCommitHashes.includes(laneCommit)
				);
				
				if (!hasChildren) {
					// This lane is no longer needed
					lanes[laneIndex] = null;
				}
			}
		}
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
