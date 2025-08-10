import { backend, git_operations } from "wailsjs/go/models";

interface GitGraphCommit {
	commit: git_operations.GitLogCommitInfo;
	column: number;
	color: string;
	parentHashes: string[];
}

// Colors for different branches
const BRANCH_COLORS = [
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

// Simplified layout for search results - all commits in column 0, disconnected unless parent-child relationship exists
function createSimplifiedSearchLayout(commits: git_operations.GitLogCommitInfo[]): GitGraphCommit[] {
	// Sort commits by commit timestamp (newest first)
	const sortedCommits = [...commits].sort((a, b) => {
		const dateA = new Date(a.commitTimeStamp).getTime();
		const dateB = new Date(b.commitTimeStamp).getTime();
		return dateB - dateA;
	});

	// Build a map to check for parent-child relationships within loaded commits
	const commitHashSet = new Set(sortedCommits.map(c => c.commitHash));
	
	const result: GitGraphCommit[] = [];
	const usedColor = BRANCH_COLORS[0]; // Use single color for search results

	sortedCommits.forEach((commit) => {
		// Only include parent hashes that exist in our loaded commits
		const availableParentHashes = commit.parentCommitHashes.filter(hash => 
			hash.trim() && commitHashSet.has(hash)
		);

		result.push({
			commit,
			column: 0, // All search results in column 0
			color: usedColor,
			parentHashes: availableParentHashes
		});
	});

	return result;
}

function calculateGitGraphLayout(commits: git_operations.GitLogCommitInfo[], isSearchMode: boolean = false): GitGraphCommit[] {
	if (!commits || commits.length === 0) {
		return [];
	}

	// If we're in search mode, use simplified layout for disconnected commits
	if (isSearchMode) {
		return createSimplifiedSearchLayout(commits);
	}

	// Step 1: Temporal topological sort (sort by committer date, newest first)
	const sortedCommits = temporalTopologicalSort([...commits]);

	// Step 2: Create commit graph data structures
	const commitGraph = createCommitGraph(sortedCommits);

	// Step 3: Assign columns using straight branches algorithm
	const result = assignColumns(commitGraph);

	return result;
}

// Temporal topological sort as described in the article
function temporalTopologicalSort(commits: git_operations.GitLogCommitInfo[]): git_operations.GitLogCommitInfo[] {
	// Build commit map for quick lookups
	const commitMap = new Map<string, git_operations.GitLogCommitInfo>();
	commits.forEach(commit => commitMap.set(commit.commitHash, commit));

	// Build children relationships
	const children = new Map<string, Set<string>>();
	commits.forEach(commit => {
		commit.parentCommitHashes.forEach(parentHash => {
			if (parentHash.trim()) {
				if (!children.has(parentHash)) {
					children.set(parentHash, new Set());
				}
				children.get(parentHash)!.add(commit.commitHash);
			}
		});
	});

	// Sort commits by committer date (newest to oldest)
	const sortedByDate = [...commits].sort((a, b) => {
		const dateA = new Date(a.commitTimeStamp).getTime();
		const dateB = new Date(b.commitTimeStamp).getTime();
		return dateB - dateA; // newest first
	});

	// Temporal topological sort using DFS
	const explored = new Set<string>();
	const result: git_operations.GitLogCommitInfo[] = [];

	function dfs(commitHash: string) {
		if (explored.has(commitHash)) {
			return;
		}
		explored.add(commitHash);

		// Process all children first
		const commitChildren = children.get(commitHash) || new Set();
		commitChildren.forEach(childHash => {
			dfs(childHash);
		});

		// Add current commit after processing children
		const commit = commitMap.get(commitHash);
		if (commit) {
			result.push(commit);
		}
	}

	// Start DFS from commits sorted by date (newest first)
	sortedByDate.forEach(commit => {
		dfs(commit.commitHash);
	});

	return result;
}

// Enhanced commit structure for graph processing
interface GraphCommit {
	commit: git_operations.GitLogCommitInfo;
	row: number;
	branchChildren: string[];
	mergeChildren: string[];
	parentHashes: string[];
}

// Create commit graph with enhanced relationships
function createCommitGraph(sortedCommits: git_operations.GitLogCommitInfo[]): GraphCommit[] {
	const commitMap = new Map<string, git_operations.GitLogCommitInfo>();
	const children = new Map<string, Set<string>>();

	// Build maps
	sortedCommits.forEach(commit => {
		commitMap.set(commit.commitHash, commit);
		commit.parentCommitHashes.forEach(parentHash => {
			if (parentHash.trim()) {
				if (!children.has(parentHash)) {
					children.set(parentHash, new Set());
				}
				children.get(parentHash)!.add(commit.commitHash);
			}
		});
	});

	// Create graph commits with branch/merge children classification
	const graphCommits: GraphCommit[] = [];
	sortedCommits.forEach((commit, index) => {
		const commitChildren = Array.from(children.get(commit.commitHash) || []);
		
		// Separate branch children from merge children
		const branchChildren: string[] = [];
		const mergeChildren: string[] = [];

		commitChildren.forEach(childHash => {
			const child = commitMap.get(childHash);
			if (child && child.parentCommitHashes.length > 0) {
				// If this commit is the first parent, it's a branch child
				if (child.parentCommitHashes[0] === commit.commitHash) {
					branchChildren.push(childHash);
				} else {
					// Otherwise, it's a merge child
					mergeChildren.push(childHash);
				}
			}
		});

		graphCommits.push({
			commit,
			row: index,
			branchChildren,
			mergeChildren,
			parentHashes: commit.parentCommitHashes.filter(h => h.trim())
		});
	});

	return graphCommits;
}

// Assign columns using straight branches algorithm from the article
function assignColumns(graphCommits: GraphCommit[]): GitGraphCommit[] {
	// List of active branches (null means available)
	const activeBranches: (string | null)[] = [];
	// Map commit hash to column
	const commitToColumn = new Map<string, number>();
	// Map column to color
	const columnToColor = new Map<number, string>();
	let colorIndex = 0;

	const result: GitGraphCommit[] = [];

	// Process commits from lowest row to highest (topologically sorted order)
	graphCommits.forEach(graphCommit => {
		const { commit, branchChildren, mergeChildren } = graphCommit;
		
		// Compute forbidden columns for this commit
		const forbiddenColumns = computeForbiddenColumns(commit, mergeChildren, commitToColumn, activeBranches, graphCommits);

		let selectedColumn = -1;
		
		// Try to continue in a branch child's column if possible
		const availableBranchChildren = branchChildren.filter(childHash => {
			const childColumn = commitToColumn.get(childHash);
			return childColumn !== undefined && !forbiddenColumns.has(childColumn);
		});

		if (availableBranchChildren.length > 0) {
			// Select the leftmost available branch child
			const selectedChild = availableBranchChildren.reduce((leftmost, current) => {
				const leftmostColumn = commitToColumn.get(leftmost)!;
				const currentColumn = commitToColumn.get(current)!;
				return currentColumn < leftmostColumn ? current : leftmost;
			});
			
			selectedColumn = commitToColumn.get(selectedChild)!;
			activeBranches[selectedColumn] = commit.commitHash;
		} else {
			// Find first available column or create new one
			selectedColumn = activeBranches.findIndex(branch => branch === null);
			
			if (selectedColumn === -1) {
				// No available column, create new one
				selectedColumn = activeBranches.length;
				activeBranches.push(commit.commitHash);
			} else {
				// Use available column
				activeBranches[selectedColumn] = commit.commitHash;
			}

			// Assign color for new column
			if (!columnToColor.has(selectedColumn)) {
				columnToColor.set(selectedColumn, BRANCH_COLORS[colorIndex % BRANCH_COLORS.length]);
				colorIndex++;
			}
		}

		// Record column assignment
		commitToColumn.set(commit.commitHash, selectedColumn);

		// Clear columns for remaining branch children
		branchChildren.forEach(childHash => {
			const childColumn = commitToColumn.get(childHash);
			if (childColumn !== undefined && childColumn !== selectedColumn) {
				activeBranches[childColumn] = null;
			}
		});

		// Get color
		const color = columnToColor.get(selectedColumn) || BRANCH_COLORS[0];

		result.push({
			commit,
			column: selectedColumn,
			color,
			parentHashes: commit.parentCommitHashes.filter(h => h.trim())
		});
	});

	return result;
}

// Compute forbidden columns for a commit (simplified version)
function computeForbiddenColumns(
	commit: git_operations.GitLogCommitInfo,
	mergeChildren: string[],
	commitToColumn: Map<string, number>,
	activeBranches: (string | null)[],
	graphCommits: GraphCommit[]
): Set<number> {
	const forbidden = new Set<number>();

	if (mergeChildren.length === 0) {
		return forbidden;
	}

	// Find the minimum row of merge children
	const commitRowMap = new Map<string, number>();
	graphCommits.forEach(gc => commitRowMap.set(gc.commit.commitHash, gc.row));

	const currentRow = commitRowMap.get(commit.commitHash) || 0;
	const minMergeChildRow = Math.min(...mergeChildren.map(childHash => 
		commitRowMap.get(childHash) || 0
	));

	// Mark columns as forbidden if they have commits between minMergeChildRow and currentRow
	for (let col = 0; col < activeBranches.length; col++) {
		if (activeBranches[col] !== null) {
			// Check if this column has activity in the relevant row range
			const hasActivity = graphCommits.some(gc => {
				const gcColumn = commitToColumn.get(gc.commit.commitHash);
				return gcColumn === col && 
				       gc.row >= minMergeChildRow && 
				       gc.row < currentRow;
			});
			
			if (hasActivity) {
				forbidden.add(col);
			}
		}
	}

	return forbidden;
}

export { calculateGitGraphLayout, type GitGraphCommit };