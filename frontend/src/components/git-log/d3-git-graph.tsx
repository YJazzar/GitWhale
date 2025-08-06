import { useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { backend } from 'wailsjs/go/models';
import { calculateGitGraphLayout, type GitGraphCommit } from '@/hooks/git/use-git-graph';
import { GitRefs } from '@/components/git-refs';

interface D3GitGraphProps {
	commits: backend.GitLogCommitInfo[];
	onCommitClick?: (commitHash: string) => void;
	className?: string;
}

// Layout constants
const COLUMN_WIDTH = 32;
const ROW_HEIGHT = 48;
const MARGIN_LEFT = 20;
const MARGIN_TOP = 24;
const NODE_RADIUS = 6;
const MERGE_NODE_RADIUS = 8;

interface ConnectionCommit extends GitGraphCommit {
	rowIndex: number;
}

interface Connection {
	source: ConnectionCommit;
	target: ConnectionCommit;
	type: 'direct' | 'merge';
	color: string;
}

export function D3GitGraph({ commits, onCommitClick, className }: D3GitGraphProps) {
	const svgRef = useRef<SVGSVGElement>(null);
	
	console.log(`Commit length: ${commits.length}`)

	// Compute graph layout using the new hook
	const graphLayout = useMemo(() => {
		if (!commits || commits.length === 0) {
			return [];
		}
		return calculateGitGraphLayout(commits);
	}, [commits]);

	// Compute connections between commits with row indices
	const connections = useMemo((): Connection[] => {
		if (graphLayout.length === 0) return [];
		
		const commitMap = new Map<string, GitGraphCommit>();
		const commitToRowIndex = new Map<string, number>();
		
		// Build maps with explicit row indices
		graphLayout.forEach((item, index) => {
			commitMap.set(item.commit.commitHash, item);
			commitToRowIndex.set(item.commit.commitHash, index);
		});

		const links: Connection[] = [];

		graphLayout.forEach((item, sourceRowIndex) => {
			item.parentHashes.forEach((parentHash, index) => {
				const parent = commitMap.get(parentHash);
				const targetRowIndex = commitToRowIndex.get(parentHash);
				
				if (parent && targetRowIndex !== undefined) {
					const isDirectParent = index === 0;
					links.push({
						source: { ...item, rowIndex: sourceRowIndex },
						target: { ...parent, rowIndex: targetRowIndex },
						type: isDirectParent ? 'direct' : 'merge',
						color: isDirectParent ? item.color : parent.color
					});
				}
			});
		});

		return links;
	}, [commits, graphLayout]);

	// Calculate graph dimensions
	const graphDimensions = useMemo(() => {
		if (graphLayout.length === 0) {
			return { width: 200, height: 100 };
		}

		const maxColumn = Math.max(...graphLayout.map(item => item.column), 0);
		const width = (maxColumn + 1) * COLUMN_WIDTH + MARGIN_LEFT * 2;
		const height = graphLayout.length * ROW_HEIGHT + MARGIN_TOP * 2;

		return { width, height };
	}, [graphLayout]);

	// D3.js rendering effect
	useEffect(() => {
		if (!svgRef.current || !commits || commits.length === 0 || graphLayout.length === 0 || connections.length === 0) return;

			// Clear previous render
			d3.select(svgRef.current).selectAll('*').remove();

		const svg = d3.select(svgRef.current);
		const { width, height } = graphDimensions;

		// Set SVG dimensions
		svg.attr('width', width)
		   .attr('height', height)
		   .attr('viewBox', `0 0 ${width} ${height}`);

		// Get theme-aware colors from CSS custom properties
		const rootStyles = getComputedStyle(document.documentElement);
		const borderColor = rootStyles.getPropertyValue('--border').trim() || '210 214 220';
		const backgroundColor = rootStyles.getPropertyValue('--background').trim() || '0 0% 100%';
		const columnLineColor = `hsl(${borderColor})`;
		const nodeStrokeColor = `hsl(${backgroundColor})`;

		// Draw background column lines
		const maxColumn = Math.max(...graphLayout.map(item => item.column), 0);
		svg.selectAll('.column-line')
			.data(Array.from({ length: maxColumn + 1 }, (_, i) => i))
			.enter()
			.append('line')
			.attr('class', 'column-line')
			.attr('x1', (d: number) => d * COLUMN_WIDTH + MARGIN_LEFT + NODE_RADIUS)
			.attr('y1', MARGIN_TOP)
			.attr('x2', (d: number) => d * COLUMN_WIDTH + MARGIN_LEFT + NODE_RADIUS)
			.attr('y2', height - MARGIN_TOP)
			.attr('stroke', columnLineColor)
			.attr('stroke-width', 1)
			.attr('opacity', 0.3);

		// Create defs for filters and gradients
		const defs = svg.append('defs');
		
		// Glow filter for merge connections
		const filter = defs.append('filter')
			.attr('id', 'glow')
			.attr('x', '-50%')
			.attr('y', '-50%')
			.attr('width', '200%')
			.attr('height', '200%');
		
		filter.append('feGaussianBlur')
			.attr('stdDeviation', '2')
			.attr('result', 'coloredBlur');
		
		const feMerge = filter.append('feMerge');
		feMerge.append('feMergeNode').attr('in', 'coloredBlur');
		feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

		// Draw connections between commits
		const connectionGroup = svg.append('g').attr('class', 'connections');
		
		connectionGroup.selectAll('.connection')
			.data(connections)
			.enter()
			.append('path')
			.attr('class', d => `connection ${d.type}`)
			.attr('d', (d: Connection) => {
				const sourceX = d.source.column * COLUMN_WIDTH + MARGIN_LEFT + NODE_RADIUS;
				const sourceY = d.source.rowIndex * ROW_HEIGHT + MARGIN_TOP + NODE_RADIUS;
				const targetX = d.target.column * COLUMN_WIDTH + MARGIN_LEFT + NODE_RADIUS;
				const targetY = d.target.rowIndex * ROW_HEIGHT + MARGIN_TOP + NODE_RADIUS;

				if (d.type === 'direct' && d.source.column === d.target.column) {
					// Straight vertical line for same column
					return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
				} else {
					// Angular path with rounded corners for different columns
					const cornerRadius = 8;
					const midY = sourceY + (targetY - sourceY) * 0.6; // Bend point closer to source
					
					if (sourceX < targetX) {
						// Moving right - start vertical, then horizontal, then vertical
						return `M ${sourceX} ${sourceY} 
						        L ${sourceX} ${midY - cornerRadius}
						        Q ${sourceX} ${midY} ${sourceX + cornerRadius} ${midY}
						        L ${targetX - cornerRadius} ${midY}
						        Q ${targetX} ${midY} ${targetX} ${midY + cornerRadius}
						        L ${targetX} ${targetY}`;
					} else {
						// Moving left - start vertical, then horizontal, then vertical  
						return `M ${sourceX} ${sourceY}
						        L ${sourceX} ${midY - cornerRadius}
						        Q ${sourceX} ${midY} ${sourceX - cornerRadius} ${midY}
						        L ${targetX + cornerRadius} ${midY}
						        Q ${targetX} ${midY} ${targetX} ${midY + cornerRadius}
						        L ${targetX} ${targetY}`;
					}
				}
			})
			.attr('stroke', (d: Connection) => d.color)
			.attr('stroke-width', (d: Connection) => d.type === 'merge' ? 2.5 : 2)
			.attr('fill', 'none')
			.attr('opacity', (d: Connection) => d.type === 'merge' ? 0.8 : 0.7)
			.style('filter', (d: Connection) => d.type === 'merge' ? 'url(#glow)' : 'none');

		// Draw commit nodes
		const nodeGroup = svg.append('g').attr('class', 'nodes');
		
		const nodes = nodeGroup.selectAll('.commit-node')
			.data(graphLayout)
			.enter()
			.append('g')
			.attr('class', 'commit-node')
			.attr('transform', (d: GitGraphCommit, i: number) => 
				`translate(${d.column * COLUMN_WIDTH + MARGIN_LEFT + NODE_RADIUS}, 
				           ${i * ROW_HEIGHT + MARGIN_TOP + NODE_RADIUS})`)
			.style('cursor', 'pointer');

		// Add circles for commits
		nodes.append('circle')
			.attr('r', (d: GitGraphCommit) => {
				const isMerge = d.parentHashes.length > 1;
				return isMerge ? MERGE_NODE_RADIUS : NODE_RADIUS;
			})
			.attr('fill', (d: GitGraphCommit) => {
				const isMerge = d.parentHashes.length > 1;
				return isMerge ? '#fbbf24' : d.color; // Gold for merge commits
			})
			.attr('stroke', nodeStrokeColor)
			.attr('stroke-width', 2)
			.style('filter', 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))')
			.on('mouseover', function(event, d: GitGraphCommit) {
				const circle = d3.select(this);
				const isMerge = d.parentHashes.length > 1;
				circle.transition()
					.duration(150)
					.attr('r', isMerge ? MERGE_NODE_RADIUS + 2 : NODE_RADIUS + 2);
			})
			.on('mouseout', function(event, d: GitGraphCommit) {
				const circle = d3.select(this);
				const isMerge = d.parentHashes.length > 1;
				circle.transition()
					.duration(150)
					.attr('r', isMerge ? MERGE_NODE_RADIUS : NODE_RADIUS);
			})
			.on('click', function(event, d: GitGraphCommit) {
				onCommitClick?.(d.commit.commitHash);
			});

		// Add icons to nodes
		nodes.append('text')
			.attr('text-anchor', 'middle')
			.attr('dy', '0.35em')
			.attr('font-size', '8px')
			.attr('font-weight', 'bold')
			.attr('fill', 'white')
			.attr('pointer-events', 'none')
			.text((d: GitGraphCommit) => {
				const isMerge = d.parentHashes.length > 1;
				return isMerge ? '⚡' : '●';
			});
	}, [graphLayout, connections, graphDimensions, onCommitClick]);

	// Render empty state
	if (!commits || commits.length === 0) {
		return (
			<div className={className}>
				<div className="flex items-center justify-center h-32 text-muted-foreground">
					<span>No commits to display</span>
				</div>
			</div>
		);
	}

	return (
		<div className={className}>
			<div className="flex bg-background">
				{/* Graph SVG */}
				<div className="flex-shrink-0">
					<svg 
						ref={svgRef} 
						className="block" 
						style={{ minWidth: graphDimensions.width }}
					/>
				</div>
				
				{/* Commit details */}
				<div className="flex-1 min-w-0 bg-background">
					{graphLayout.map((item, index) => {
						const { commit } = item;
						const commitMessage = Array.isArray(commit.commitMessage)
							? commit.commitMessage.join('\n')
							: commit.commitMessage;
						
						const firstLine = commitMessage.split('\n')[0];
						const displayMessage = firstLine.length > 75 
							? firstLine.slice(0, 75) + '...' 
							: firstLine;
						const shortHash = commit.commitHash.slice(0, 7);
						
						return (
							<div
								key={commit.commitHash}
								className="flex items-center px-3 py-1.5 hover:bg-accent/50 hover:shadow-sm transition-all duration-200 cursor-pointer group border-l-2 hover:border-primary/20"
								style={{ 
									height: `${ROW_HEIGHT}px`,
									borderLeftColor: item.color,
								}}
								onClick={() => onCommitClick?.(commit.commitHash)}
							>
								<div className="flex-1 min-w-0">
									{/* Commit message and refs */}
									<div className="flex items-start gap-2 mb-1">
										<span className="text-sm text-foreground font-medium truncate flex-1">
											{displayMessage}
										</span>
										{commit.refs && (
											<GitRefs refs={commit.refs} />
										)}
									</div>
									
									{/* Commit metadata */}
									<div className="flex items-center gap-3 text-xs text-muted-foreground">
										<span className="font-mono font-medium text-primary">
											{shortHash}
										</span>
										<span>{commit.username}</span>
										<span>
											{new Date(commit.commitTimeStamp).toLocaleDateString()}
										</span>
										{commit.shortStat && (
											<span className="text-xs bg-muted px-1.5 py-0.5 rounded">
												{commit.shortStat}
											</span>
										)}
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