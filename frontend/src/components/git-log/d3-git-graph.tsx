import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { backend } from 'wailsjs/go/models';
import { GitRefs } from '@/components/git-refs';

interface GitGraphNode {
	id: string;
	commit: backend.GitLogCommitInfo;
	x: number;
	y: number;
	column: number;
	color: string;
}

interface GitGraphLink {
	source: string;
	target: string;
	type: 'direct' | 'merge';
	sourceColumn: number;
	targetColumn: number;
	color: string;
	sourceX: number;
	sourceY: number;
	targetX: number;
	targetY: number;
}

interface D3GitGraphProps {
	commits: backend.GitLogCommitInfo[];
	onCommitClick?: (commitHash: string) => void;
	className?: string;
}

const COLUMN_WIDTH = 32;
const ROW_HEIGHT = 48;
const COLORS = [
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

export function D3GitGraph({ commits, onCommitClick, className }: D3GitGraphProps) {
	const svgRef = useRef<SVGSVGElement>(null);
	const { nodes, links } = calculateGitGraphLayout(commits);

	useEffect(() => {
		if (!svgRef.current || !commits.length) return;

		// Clear previous render
		d3.select(svgRef.current).selectAll('*').remove();

		const maxColumn = Math.max(...nodes.map(n => n.column), 0);
		const graphWidth = (maxColumn + 1) * COLUMN_WIDTH + 40;
		const height = commits.length * ROW_HEIGHT;

		// Setup SVG with just the graph portion
		const svg = d3.select(svgRef.current)
			.attr('width', graphWidth)
			.attr('height', height)
			.attr('viewBox', `0 0 ${graphWidth} ${height}`)
			.style('flex-shrink', '0');

		// Create background lines for each column
		svg.selectAll('.column-line')
			.data(Array.from({ length: maxColumn + 1 }, (_, i) => i))
			.enter()
			.append('line')
			.attr('class', 'column-line')
			.attr('x1', (d: number) => d * COLUMN_WIDTH + 20 + 16)
			.attr('y1', 0)
			.attr('x2', (d: number) => d * COLUMN_WIDTH + 20 + 16)
			.attr('y2', height)
			.attr('stroke', '#e5e7eb')
			.attr('stroke-width', 1)
			.attr('opacity', 0.3);

		// Create links (connections between commits)
		const linkGroup = svg.append('g').attr('class', 'links');
		
		linkGroup.selectAll('.link')
			.data(links)
			.enter()
			.append('path')
			.attr('class', 'link')
			.attr('d', (d: GitGraphLink) => {
				if (d.type === 'direct' && d.sourceColumn === d.targetColumn) {
					// Straight line for same column
					return `M ${d.sourceX} ${d.sourceY} L ${d.targetX} ${d.targetY}`;
				} else {
					// Curved line for merges or column changes
					const midY = (d.sourceY + d.targetY) / 2;
					return `M ${d.sourceX} ${d.sourceY} 
						C ${d.sourceX} ${midY}, ${d.targetX} ${midY}, ${d.targetX} ${d.targetY}`;
				}
			})
			.attr('stroke', (d: GitGraphLink) => d.color)
			.attr('stroke-width', (d: GitGraphLink) => d.type === 'merge' ? 3 : 2)
			.attr('fill', 'none')
			.attr('opacity', 0.8)
			.attr('stroke-linecap', 'round');

		// Add glow effect for merge links
		const defs = svg.append('defs');
		
		links.filter(d => d.type === 'merge').forEach((_, i) => {
			const filterId = `glow-${i}`;
			const filter = defs.append('filter')
				.attr('id', filterId)
				.attr('x', '-50%')
				.attr('y', '-50%')
				.attr('width', '200%')
				.attr('height', '200%');
			
			filter.append('feGaussianBlur')
				.attr('stdDeviation', '3')
				.attr('result', 'coloredBlur');
			
			const feMerge = filter.append('feMerge');
			feMerge.append('feMergeNode').attr('in', 'coloredBlur');
			feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
		});

		// Apply glow to merge links
		const mergeLinks = linkGroup.selectAll('.link').nodes().filter((node: any) => {
			const data = d3.select(node).data()[0] as GitGraphLink;
			return data.type === 'merge';
		});
		
		mergeLinks.forEach((node: any, i: number) => {
			d3.select(node).attr('filter', `url(#glow-${i})`);
		});

		// Create commit nodes
		const nodeGroup = svg.append('g').attr('class', 'nodes');
		
		const node = nodeGroup.selectAll('.node')
			.data(nodes)
			.enter()
			.append('g')
			.attr('class', 'node')
			.attr('transform', (d: GitGraphNode) => `translate(${d.x}, ${d.y})`)
			.style('cursor', 'pointer')
			.on('click', (_: any, d: GitGraphNode) => {
				onCommitClick?.(d.commit.commitHash);
			});

		// Add commit circles
		node.append('circle')
			.attr('r', (d: GitGraphNode) => {
				const parentCount = d.commit.parentCommitHashes.filter((h: string) => h.trim()).length;
				return parentCount > 1 ? 8 : 6;
			})
			.attr('fill', (d: GitGraphNode) => {
				const parentCount = d.commit.parentCommitHashes.filter((h: string) => h.trim()).length;
				return parentCount > 1 ? '#fbbf24' : d.color;
			})
			.attr('stroke', '#ffffff')
			.attr('stroke-width', 2)
			.style('filter', 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))')
			.on('mouseover', function() {
				const circle = d3.select(this);
				const data = circle.data()[0] as GitGraphNode;
				const parentCount = data.commit.parentCommitHashes.filter((h: string) => h.trim()).length;
				circle.transition()
					.duration(200)
					.attr('r', parentCount > 1 ? 10 : 8);
			})
			.on('mouseout', function() {
				const circle = d3.select(this);
				const data = circle.data()[0] as GitGraphNode;
				const parentCount = data.commit.parentCommitHashes.filter((h: string) => h.trim()).length;
				circle.transition()
					.duration(200)
					.attr('r', parentCount > 1 ? 8 : 6);
			});

		// Add commit icons
		node.append('text')
			.attr('text-anchor', 'middle')
			.attr('dy', '0.35em')
			.attr('font-size', '8px')
			.attr('fill', 'white')
			.text((d: GitGraphNode) => {
				const parentCount = d.commit.parentCommitHashes.filter((h: string) => h.trim()).length;
				return parentCount > 1 ? '⚡' : '●';
			});

	}, [commits, onCommitClick, nodes, links]);

	// Render commit details alongside the graph
	return (
		<div className={className}>
			<div className="flex">
				{/* Graph SVG */}
				<svg ref={svgRef} className="flex-shrink-0" />
				
				{/* Commit details */}
				<div className="flex-1 min-w-0">
					{commits.map((commit) => {
						const commitMessage = Array.isArray(commit.commitMessage)
							? commit.commitMessage.join('\n')
							: commit.commitMessage;
						
						const firstLine = commitMessage.split('\n')[0];
						const displayMessage = firstLine.length > 75 ? firstLine.slice(0, 75) + '...' : firstLine;
						const shortHash = commit.commitHash.slice(0, 7);
						const nodeColor = nodes.find(n => n.id === commit.commitHash)?.color || '#3b82f6';
						
						return (
							<div
								key={commit.commitHash}
								className="flex items-center px-3 py-1.5 hover:bg-accent/50 hover:shadow-sm transition-all duration-200 cursor-pointer group border-l-3 hover:border-primary/20"
								style={{ 
									height: `${ROW_HEIGHT}px`,
									borderLeftColor: nodeColor,
									borderLeftWidth: '3px',
									borderLeftStyle: 'solid'
								}}
								onClick={() => onCommitClick?.(commit.commitHash)}
							>
								<div className="flex-1 min-w-0">
									{/* Commit message and refs */}
									<div className="flex items-start gap-2 mb-1">
										<h3 className="font-medium text-sm leading-tight text-foreground truncate flex-1 min-w-0 group-hover:text-primary transition-colors">
											{displayMessage}
										</h3>
										<GitRefs refs={commit.refs} size="sm" />
									</div>

									{/* Author, timestamp, and hash */}
									<div className="flex items-center gap-3 text-xs text-muted-foreground overflow-hidden">
										<span className="truncate">{commit.username}</span>
										<span className="flex-shrink-0">
											{new Date(Number(commit.commitTimeStamp) * 1000).toLocaleDateString()}
										</span>
										<code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono group-hover:bg-primary/10 transition-colors flex-shrink-0">
											{shortHash}
										</code>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function calculateGitGraphLayout(commits: backend.GitLogCommitInfo[]): { nodes: GitGraphNode[]; links: GitGraphLink[] } {
	const nodes: GitGraphNode[] = [];
	const links: GitGraphLink[] = [];
	
	if (commits.length === 0) {
		return { nodes, links };
	}

	// Build a map of commit hash to commit for quick lookups
	const commitMap = new Map<string, backend.GitLogCommitInfo>();
	commits.forEach(commit => commitMap.set(commit.commitHash, commit));

	// Track which commits are assigned to which columns
	const commitToColumn = new Map<string, number>();
	const columnToColor = new Map<number, string>();
	
	// Active lanes: array where each index represents a column, value is the commit hash currently "owning" that column
	const activeLanes: (string)[] = [];
	let colorIndex = 0;

	// Process commits in chronological order (newest first, as they appear in the UI)
	for (let index = commits.length - 1; index >= 0; index--) {
		const commit = commits[index];
		const parentHashes = commit.parentCommitHashes.filter(h => h.trim() !== '');
		
		let assignedColumn = -1;
		
		debugger;

		// Strategy: Try to continue from parent's column when possible
		if (parentHashes.length > 0) {
			const primaryParent = parentHashes[0];
			const parentColumn = commitToColumn.get(primaryParent);
			
			if (parentColumn !== undefined) {
				// Continue in the same column as the primary parent
				assignedColumn = parentColumn;
			}
		}
		
		// If we couldn't continue from parent, find or create a new column
		if (assignedColumn === -1) {
			// No empty column, create a new one
			assignedColumn = activeLanes.length;
			activeLanes.push(commit.commitHash);
			
			// Assign a new color for this branch
			columnToColor.set(assignedColumn, COLORS[colorIndex % COLORS.length]);
			colorIndex++;
		}
		
		// Claim this column for this commit
		commitToColumn.set(commit.commitHash, assignedColumn);
		
		// For merge commits, ensure all parents get assigned columns if they don't have them
		if (parentHashes.length > 1) {
			parentHashes.forEach(parentHash => {
				if (!commitToColumn.has(parentHash)) {
					// Find an empty column for this merge parent
					const parentColumn = activeLanes.length;
					activeLanes.push(parentHash);
					commitToColumn.set(parentHash, parentColumn);
					
					columnToColor.set(parentColumn, COLORS[colorIndex % COLORS.length]);
					colorIndex++;
				}
			});
		}
		
		// Create the node
		const column = assignedColumn;
		const color = columnToColor.get(column) || COLORS[COLORS.length- 1];
		
		nodes.push({
			id: commit.commitHash,
			commit,
			x: column * COLUMN_WIDTH + 36,
			y: index * ROW_HEIGHT + 24,
			column,
			color
		});
		
		// Clean up lanes: remove commits that have no more children coming up
		// const remainingCommits = commits.slice(index + 1);
		// activeLanes.forEach((laneCommit, laneIndex) => {
		// 	if (laneCommit && laneCommit !== commit.commitHash) {
		// 		// Check if this commit has any children in the remaining commits
		// 		const hasChildren = remainingCommits.some(futureCommit =>
		// 			futureCommit.parentCommitHashes.includes(laneCommit)
		// 		);
				
		// 		if (!hasChildren) {
		// 			activeLanes[laneIndex] = null;
		// 		}
		// 	}
		// });
	};

	console.debug({ nodes, links, commitToColumn, columnToColor });
	
	// Create links between commits and their parents
	nodes.forEach(node => {
		const parentHashes = node.commit.parentCommitHashes.filter(h => h.trim() !== '');
		
		parentHashes.forEach((parentHash, parentIndex) => {
			const parentNode = nodes.find(n => n.id === parentHash);
			if (parentNode) {
				const linkType = parentIndex === 0 ? 'direct' : 'merge';
				const linkColor = parentIndex === 0 ? node.color : parentNode.color;
				
				links.push({
					source: node.id,
					target: parentNode.id,
					type: linkType,
					sourceColumn: node.column,
					targetColumn: parentNode.column,
					color: linkColor,
					sourceX: node.x,
					sourceY: node.y,
					targetX: parentNode.x,
					targetY: parentNode.y
				});
			}
		});
	});

	return { nodes, links };
}