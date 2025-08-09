import { GitRefs } from '@/components/git-refs';
import { calculateGitGraphLayout, type GitGraphCommit } from '@/hooks/git/use-git-graph';
import { useUnixTime } from '@/hooks/use-unix-time';
import * as d3 from 'd3';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { git_operations } from 'wailsjs/go/models';

interface D3GitGraphProps {
	commits: git_operations.GitLogCommitInfo[];
	onCommitClick: (commitHash: string) => void;
	onCommitDoubleClick: (commitHash: string) => void;
	selectedCommitHash: string | undefined | null;
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

// Utility functions for coordinate calculations
function getNodeX(column: number): number {
	return column * COLUMN_WIDTH + MARGIN_LEFT + NODE_RADIUS;
}

function getNodeY(rowIndex: number): number {
	return rowIndex * ROW_HEIGHT + MARGIN_TOP + NODE_RADIUS;
}

function calculateGraphDimensions(graphLayout: GitGraphCommit[]) {
	if (graphLayout.length === 0) {
		return { width: 200, height: 100 };
	}

	const maxColumn = Math.max(...graphLayout.map((item) => item.column), 0);
	const width = (maxColumn + 1) * COLUMN_WIDTH + MARGIN_LEFT * 2;
	const height = graphLayout.length * ROW_HEIGHT + MARGIN_TOP * 2;

	return { width, height };
}

// Path generation functions
function generateConnectionPath(connection: Connection, height: number): string {
	const sourceX = getNodeX(connection.source.column);
	const sourceY = getNodeY(connection.source.rowIndex);
	const targetX = getNodeX(connection.target.column);
	const targetY = getNodeY(connection.target.rowIndex);

	if (connection.type === 'extension') {
		const bottomY = height - MARGIN_TOP;
		return `M ${sourceX} ${sourceY} L ${sourceX} ${bottomY}`;
	}

	if (connection.type === 'direct' && connection.source.column === connection.target.column) {
		return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
	}

	// Angular path with rounded corners for different columns
	const cornerRadius = 8;
	const midY = sourceY + (targetY - sourceY) * 0.6;

	if (sourceX < targetX) {
		return `M ${sourceX} ${sourceY} 
		        L ${sourceX} ${midY - cornerRadius}
		        Q ${sourceX} ${midY} ${sourceX + cornerRadius} ${midY}
		        L ${targetX - cornerRadius} ${midY}
		        Q ${targetX} ${midY} ${targetX} ${midY + cornerRadius}
		        L ${targetX} ${targetY}`;
	} else {
		return `M ${sourceX} ${sourceY}
		        L ${sourceX} ${midY - cornerRadius}
		        Q ${sourceX} ${midY} ${sourceX - cornerRadius} ${midY}
		        L ${targetX + cornerRadius} ${midY}
		        Q ${targetX} ${midY} ${targetX} ${midY + cornerRadius}
		        L ${targetX} ${targetY}`;
	}
}

// SVG rendering functions
function setupSVGFilters(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
	const defs = svg.append('defs');

	const filter = defs
		.append('filter')
		.attr('id', 'subtle-glow')
		.attr('x', '-20%')
		.attr('y', '-20%')
		.attr('width', '140%')
		.attr('height', '140%');

	filter.append('feGaussianBlur').attr('stdDeviation', '0.8').attr('result', 'coloredBlur');

	const feMerge = filter.append('feMerge');
	feMerge.append('feMergeNode').attr('in', 'coloredBlur');
	feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
}

function drawColumnLines(
	svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
	graphLayout: GitGraphCommit[],
	height: number
) {
	const rootStyles = getComputedStyle(document.documentElement);
	const borderColor = rootStyles.getPropertyValue('--border').trim() || '210 214 220';
	const columnLineColor = `hsl(${borderColor})`;

	const maxColumn = Math.max(...graphLayout.map((item) => item.column), 0);
	svg.selectAll('.column-line')
		.data(Array.from({ length: maxColumn + 1 }, (_, i) => i))
		.enter()
		.append('line')
		.attr('class', 'column-line')
		.attr('x1', (d: number) => getNodeX(d))
		.attr('y1', MARGIN_TOP)
		.attr('x2', (d: number) => getNodeX(d))
		.attr('y2', height - MARGIN_TOP)
		.attr('stroke', columnLineColor)
		.attr('stroke-width', 1)
		.attr('opacity', 0.3);
}

function drawConnections(
	svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
	connections: Connection[],
	height: number
) {
	const connectionGroup = svg.append('g').attr('class', 'connections');

	connectionGroup
		.selectAll('.connection')
		.data(connections)
		.enter()
		.append('path')
		.attr('class', (d) => `connection ${d.type}`)
		.attr('d', (d: Connection) => generateConnectionPath(d, height))
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
		.attr('stroke-dasharray', (d: Connection) => (d.type === 'extension' ? '4,4' : 'none'))
		.style('filter', 'none');
}

function drawCommitNodes(
	svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
	graphLayout: GitGraphCommit[],
	selectedCommitHash: string | null | undefined,
	handleSingleClick: (commitHash: string) => void,
	handleDoubleClick: (commitHash: string) => void
) {
	const rootStyles = getComputedStyle(document.documentElement);
	const backgroundColor = rootStyles.getPropertyValue('--background').trim() || '0 0% 100%';
	const nodeStrokeColor = `hsl(${backgroundColor})`;

	const nodeGroup = svg.append('g').attr('class', 'nodes');

	const nodes = nodeGroup
		.selectAll('.commit-node')
		.data(graphLayout)
		.enter()
		.append('g')
		.attr('class', 'commit-node')
		.attr(
			'transform',
			(d: GitGraphCommit, i: number) => `translate(${getNodeX(d.column)}, ${getNodeY(i)})`
		)
		.style('cursor', 'pointer');

	// Add circles for commits
	nodes
		.append('circle')
		.attr('r', (d: GitGraphCommit) => {
			const isMerge = d.parentHashes.length > 1;
			const isSelected = selectedCommitHash === d.commit.commitHash;
			const baseRadius = isMerge ? MERGE_NODE_RADIUS : NODE_RADIUS;
			return isSelected ? baseRadius + 2 : baseRadius;
		})
		.attr('fill', (d: GitGraphCommit) => {
			const isMerge = d.parentHashes.length > 1;
			return isMerge ? '#fbbf24' : d.color;
		})
		.attr('stroke', (d: GitGraphCommit) => {
			const isSelected = selectedCommitHash === d.commit.commitHash;
			if (isSelected) {
				const rootStyles = getComputedStyle(document.documentElement);
				const primaryColor = rootStyles.getPropertyValue('--primary').trim() || '210 40% 98%';
				return `hsl(${primaryColor})`;
			}
			return nodeStrokeColor;
		})
		.attr('stroke-width', (d: GitGraphCommit) => {
			const isSelected = selectedCommitHash === d.commit.commitHash;
			return isSelected ? 4 : 2;
		})
		.style('filter', (d: GitGraphCommit) => {
			const isSelected = selectedCommitHash === d.commit.commitHash;
			return isSelected
				? 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2))'
				: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))';
		})
		.on('mouseover', function (_, d: GitGraphCommit) {
			const circle = d3.select(this);
			const isMerge = d.parentHashes.length > 1;
			const isSelected = selectedCommitHash === d.commit.commitHash;
			const baseRadius = isMerge ? MERGE_NODE_RADIUS : NODE_RADIUS;
			const targetRadius = isSelected ? baseRadius + 3 : baseRadius + 2;
			circle.transition().duration(150).attr('r', targetRadius);
		})
		.on('mouseout', function (_, d: GitGraphCommit) {
			const circle = d3.select(this);
			const isMerge = d.parentHashes.length > 1;
			const isSelected = selectedCommitHash === d.commit.commitHash;
			const baseRadius = isMerge ? MERGE_NODE_RADIUS : NODE_RADIUS;
			const targetRadius = isSelected ? baseRadius + 2 : baseRadius;
			circle.transition().duration(150).attr('r', targetRadius);
		})
		.on('click', function (_, d: GitGraphCommit) {
			handleSingleClick(d.commit.commitHash);
		})
		.on('dblclick', function (_, d: GitGraphCommit) {
			handleDoubleClick(d.commit.commitHash);
		})

	// Add icons to nodes
	nodes
		.append('text')
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
}

// Function to calculate connections between commits
function calculateConnections(graphLayout: GitGraphCommit[]): Connection[] {
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
					color: isDirectParent ? item.color : parent.color,
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
					color: item.color,
				});
			}
		});
	});

	return links;
}

// Component for rendering commit details
function CommitDetails({
	graphLayout,
	connections,
}: {
	graphLayout: GitGraphCommit[];
	connections: Connection[];
}) {
	return (
		<div className="absolute top-0 left-0 w-full pointer-events-none">
			{graphLayout.map((item, index) => {
				const { commit } = item;
				const commitMessage = Array.isArray(commit.commitMessage)
					? commit.commitMessage.join('\n')
					: commit.commitMessage;

				const firstLine = commitMessage.split('\n')[0];
				const displayMessage = firstLine.length > 60 ? firstLine.slice(0, 60) + '...' : firstLine;
				const shortHash = commit.commitHash.slice(0, 7);

				const nodeX = getNodeX(item.column);
				const nodeY = getNodeY(index) - ROW_HEIGHT / 2 + 6;

				// Calculate the rightmost branch position for this row
				let rightmostBranchX = nodeX;

				connections.forEach((connection) => {
					const sourceRowIndex = connection.source.rowIndex;
					const targetRowIndex = connection.target.rowIndex;
					const minRow = Math.min(sourceRowIndex, targetRowIndex);
					const maxRow = Math.max(sourceRowIndex, targetRowIndex);

					if (index > minRow && index < maxRow) {
						const sourceX = getNodeX(connection.source.column);
						const targetX = getNodeX(connection.target.column);
						const connectionRightmostX = Math.max(sourceX, targetX);
						rightmostBranchX = Math.max(rightmostBranchX, connectionRightmostX);
					}
				});

				const textStartX = Math.max(rightmostBranchX, nodeX) + 16;

				return (
					<div
						key={commit.commitHash}
						className="absolute pointer-events-none flex items-center"
						style={{
							left: `${textStartX}px`,
							top: `${nodeY}px`,
							height: `${ROW_HEIGHT}px`,
							maxWidth: `calc(100% - ${textStartX + 16}px)`,
						}}
					>
						<div className="px-2 py-1">
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

							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<span className="font-mono font-medium text-primary">{shortHash}</span>
								<span>{commit.username}</span>
								<span>{useUnixTime(commit.commitTimeStamp).toLocaleDateString()}</span>
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
	);
}

export function D3GitGraph({
	commits,
	onCommitClick,
	onCommitDoubleClick,
	selectedCommitHash,
	className,
}: D3GitGraphProps) {
	const svgRef = useRef<SVGSVGElement>(null);
	const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Create click handlers that can detect single vs double clicks
	const handleSingleClick = useCallback((commitHash: string) => {
		// Delay single click to see if a double click follows
		if (clickTimeoutRef.current) {
			clearTimeout(clickTimeoutRef.current);
		}
		clickTimeoutRef.current = setTimeout(() => {
			const clickedHash = commitHash;
			if (selectedCommitHash === clickedHash) {
				// If clicking the already selected commit, unselect it by passing empty string
				onCommitClick('');
			} else {
				// Otherwise select the clicked commit
				onCommitClick(clickedHash);
			}
			clickTimeoutRef.current = null;
		}, 50); // Wait 300ms to detect double click
	}, [onCommitClick, selectedCommitHash]);

	const handleDoubleClick = useCallback((commitHash: string) => {
		// Clear any pending single click
		if (clickTimeoutRef.current) {
			clearTimeout(clickTimeoutRef.current);
			clickTimeoutRef.current = null;
		}
		onCommitDoubleClick(commitHash);
	}, [onCommitDoubleClick]);

	// Compute graph layout using the new hook
	const graphLayout = useMemo(() => {
		if (!commits || commits.length === 0) {
			return [];
		}
		return calculateGitGraphLayout(commits);
	}, [commits]);

	// Compute connections between commits with row indices
	const connections = useMemo((): Connection[] => {
		return calculateConnections(graphLayout);
	}, [commits, graphLayout]);

	// Calculate graph dimensions
	const graphDimensions = useMemo(() => {
		return calculateGraphDimensions(graphLayout);
	}, [graphLayout]);

	// D3.js rendering effect
	useEffect(() => {
		if (
			!svgRef.current ||
			!commits ||
			commits.length === 0 ||
			graphLayout.length === 0 ||
			connections.length === 0
		)
			return;

		// Clear previous render
		d3.select(svgRef.current).selectAll('*').remove();

		const svg = d3.select(svgRef.current);
		const { width, height } = graphDimensions;

		// Set SVG dimensions
		svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

		// Setup filters and draw components
		setupSVGFilters(svg);
		drawColumnLines(svg, graphLayout, height);
		drawConnections(svg, connections, height);
		drawCommitNodes(svg, graphLayout, selectedCommitHash, handleSingleClick, handleDoubleClick);
	}, [graphLayout, connections, graphDimensions, handleSingleClick, handleDoubleClick, selectedCommitHash]);

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
				<svg ref={svgRef} className="block" style={{ minWidth: graphDimensions.width }} />

				{/* Full-width hover rows */}
				<div className="absolute top-0 left-0 w-full pointer-events-none">
					{graphLayout.map((item, index) => {
						const nodeY = index * ROW_HEIGHT + MARGIN_TOP;
						const isSelected = selectedCommitHash === item.commit.commitHash;

						return (
							<div
								key={`hover-${item.commit.commitHash}`}
								className={`absolute w-full pointer-events-auto group transition-all duration-200 cursor-pointer ${
									isSelected
										? 'bg-primary/20 hover:bg-primary/25 border-l-4 border-l-primary shadow-sm'
										: 'hover:bg-accent/30'
								}`}
								style={{
									left: '0px',
									top: `${nodeY - ROW_HEIGHT / 2 + 6}px`,
									height: `${ROW_HEIGHT}px`,
								}}
								onClick={() => handleSingleClick(item.commit.commitHash)}
								onDoubleClick={() => handleDoubleClick(item.commit.commitHash)}
							/>
						);
					})}
				</div>

				{/* Commit details positioned relative to nodes */}
				<CommitDetails graphLayout={graphLayout} connections={connections} />
			</div>
		</div>
	);
}
