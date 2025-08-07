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
const COLUMN_WIDTH = 20;
const ROW_HEIGHT = 56;
const MARGIN_LEFT = 16;
const MARGIN_TOP = 20;
const NODE_RADIUS = 6;
const MERGE_NODE_RADIUS = 8;

interface ConnectionCommit extends GitGraphCommit {
	rowIndex: number;
}

interface Connection {
	source: ConnectionCommit;
	target: ConnectionCommit;
	type: 'direct' | 'merge' | 'extension';
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
		const lastRowIndex = graphLayout.length - 1;

		// Process each commit and its parents
		graphLayout.forEach((item, sourceRowIndex) => {
			item.parentHashes.forEach((parentHash, index) => {
				const parent = commitMap.get(parentHash);
				const targetRowIndex = commitToRowIndex.get(parentHash);
				
				if (parent && targetRowIndex !== undefined) {
					// Parent is visible - create normal connection
					const isDirectParent = index === 0;
					links.push({
						source: { ...item, rowIndex: sourceRowIndex },
						target: { ...parent, rowIndex: targetRowIndex },
						type: isDirectParent ? 'direct' : 'merge',
						color: isDirectParent ? item.color : parent.color
					});
				} else {
					// Parent is not visible (missing from loaded commits) - create extension line
					const virtualTarget: ConnectionCommit = {
						...item,
						rowIndex: lastRowIndex + 2, // Always extend beyond the last visible commit
						column: item.column, // Use the same column for the extension
					};
					
					links.push({
						source: { ...item, rowIndex: sourceRowIndex },
						target: virtualTarget,
						type: 'extension',
						color: item.color
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

		// Create defs for filters (optional subtle effects)
		const defs = svg.append('defs');
		
		// Very subtle glow filter for merge connections (reduced intensity)
		const filter = defs.append('filter')
			.attr('id', 'subtle-glow')
			.attr('x', '-20%')
			.attr('y', '-20%')
			.attr('width', '140%')
			.attr('height', '140%');
		
		filter.append('feGaussianBlur')
			.attr('stdDeviation', '0.8')
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

				if (d.type === 'extension') {
					// Extension lines go straight down to the bottom of the SVG
					const bottomY = height - MARGIN_TOP;
					return `M ${sourceX} ${sourceY} L ${sourceX} ${bottomY}`;
				} else if (d.type === 'direct' && d.source.column === d.target.column) {
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
			.attr('stroke-width', (d: Connection) => {
				if (d.type === 'extension') return 1;
				return d.type === 'merge' ? 2 : 2;
			})
			.attr('fill', 'none')
			.attr('opacity', (d: Connection) => {
				if (d.type === 'extension') return 0.4;
				return d.type === 'merge' ? 0.7 : 0.8;
			})
			.attr('stroke-dasharray', (d: Connection) => d.type === 'extension' ? '4,4' : 'none')
			.style('filter', 'none'); // Remove glow effect entirely for cleaner look

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
			<div className="relative bg-background">
				{/* Graph SVG */}
				<svg 
					ref={svgRef} 
					className="block" 
					style={{ minWidth: graphDimensions.width }}
				/>
				
				{/* Commit details positioned relative to nodes */}
				<div className="absolute top-0 left-0 w-full pointer-events-none">
					{graphLayout.map((item, index) => {
						const { commit } = item;
						const commitMessage = Array.isArray(commit.commitMessage)
							? commit.commitMessage.join('\n')
							: commit.commitMessage;
						
						const firstLine = commitMessage.split('\n')[0];
						const displayMessage = firstLine.length > 60 
							? firstLine.slice(0, 60) + '...' 
							: firstLine;
						const shortHash = commit.commitHash.slice(0, 7);
						
						// Calculate position relative to the node
						const nodeX = item.column * COLUMN_WIDTH + MARGIN_LEFT + NODE_RADIUS;
						const nodeY = index * ROW_HEIGHT + MARGIN_TOP;
						
						return (
							<div
								key={commit.commitHash}
								className="absolute pointer-events-auto"
								style={{ 
									left: `${nodeX + 16}px`, // Start 16px to the right of the node
									top: `${nodeY - 4}px`, // Slightly above center of node
									maxWidth: `calc(100% - ${nodeX + 32}px)`, // Don't overflow container
								}}
							>
								<div 
									className="px-2 py-1 hover:bg-accent/50 hover:shadow-sm transition-all duration-200 cursor-pointer group rounded-sm border border-transparent hover:border-primary/20"
									onClick={() => onCommitClick?.(commit.commitHash)}
								>
									{/* Commit message and refs */}
									<div className="flex items-start gap-2 mb-0.5">
										<span className="text-sm text-foreground font-medium truncate">
											{displayMessage}
										</span>
										{commit.refs && (
											<div className="flex-shrink-0">
												<GitRefs refs={commit.refs} />
											</div>
										)}
									</div>
									
									{/* Commit metadata */}
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
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