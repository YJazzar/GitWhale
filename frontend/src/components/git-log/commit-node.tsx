import { backend } from 'wailsjs/go/models';
import { Badge } from '@/components/ui/badge';
import { GitBranch, GitCommit, GitMerge, User, Calendar, Hash, Tag } from 'lucide-react';
import { useUnixTime } from '@/hooks/use-unix-time';

interface Connection {
	fromColumn: number;
	toColumn: number;
	type: 'straight' | 'merge' | 'branch';
	color: string;
}

interface CommitNodeProps {
	commit: backend.GitLogCommitInfo;
	branchColumn: number;
	connections: Connection[];
	incomingConnections: Connection[];
	isFirst: boolean;
	isLast: boolean;
	onCommitClick?: (commitHash: string) => void;
	generateCommitPageUrl?: (commitHash: string) => string;
}

export function CommitNode({
	commit,
	branchColumn,
	connections,
	incomingConnections,
	isFirst,
	isLast,
	onCommitClick,
	generateCommitPageUrl,
}: CommitNodeProps) {
	const shortHash = commit.commitHash.slice(0, 7);
	const commitMessage = Array.isArray(commit.commitMessage)
		? commit.commitMessage.join('\n')
		: commit.commitMessage;

	// For display, only show the first line and truncate to 75 characters
	const firstLine = commitMessage.split('\n')[0];
	const displayMessage = firstLine.length > 75 ? firstLine.slice(0, 75) + '...' : firstLine;

	// Parse refs to identify branches, origin refs, and tags
	const refs = parseRefs(commit.refs);

	// Calculate the left padding based on branch column
	const leftPadding = branchColumn * 32; // 32px per column
	
	// Calculate max columns needed for proper width
	const allColumns = [
		branchColumn,
		...connections.map(c => Math.max(c.fromColumn, c.toColumn)),
		...incomingConnections.map(c => Math.max(c.fromColumn, c.toColumn))
	];
	const maxColumn = Math.max(...allColumns, 0);
	const graphWidth = (maxColumn + 1) * 32 + 20;

	const handleCommitClick = () => {
		// Call the callback to show commit details
		onCommitClick?.(commit.commitHash);
	};

	return (
		<div className="relative flex items-start">
			{/* Graph visualization area */}
			<div
				className="relative flex-shrink-0"
				style={{ width: graphWidth }}
			>
				{/* Connection lines - extend beyond the row to ensure seamless connections */}
				<svg
					className="absolute pointer-events-none"
					style={{ 
						width: '100%',
						height: '64px', // Taller than row to overlap with adjacent rows
						top: '-8px', // Start above the row
						left: 0
					}}
				>
					{/* Continuous vertical line for this commit's column */}
					{!isFirst && (
						<line
							x1={leftPadding + 16}
							y1={0}
							x2={leftPadding + 16}
							y2={32}
							stroke={connections.find(c => c.type === 'straight')?.color || '#3b82f6'}
							strokeWidth="2"
							opacity="0.9"
						/>
					)}
					
					{!isLast && (
						<line
							x1={leftPadding + 16}
							y1={32}
							x2={leftPadding + 16}
							y2={64}
							stroke={connections.find(c => c.type === 'straight')?.color || '#3b82f6'}
							strokeWidth="2"
							opacity="0.9"
						/>
					)}

					{/* Only draw curved connections for merges (connections that change columns) */}
					{connections.map((connection, index) => {
						// Only draw curved lines if the connection changes columns
						if (connection.fromColumn !== connection.toColumn) {
							return (
								<ConnectionLine
									key={`outgoing-${index}`}
									connection={connection}
									fromY={32}
									toY={64}
									columnWidth={32}
								/>
							);
						}
						return null;
					})}
					
					{/* Incoming merge lines from above */}
					{incomingConnections.map((connection, index) => {
						// Only draw curved lines if the connection changes columns
						if (connection.fromColumn !== connection.toColumn) {
							return (
								<ConnectionLine
									key={`incoming-${index}`}
									connection={connection}
									fromY={0}
									toY={32}
									columnWidth={32}
								/>
							);
						}
						return null;
					})}
				</svg>

				{/* Commit dot */}
				<div
					className="absolute z-20 w-4 h-4 rounded-full border-2 bg-background flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-110"
					style={{
						left: leftPadding + 8,
						top: 24, // Adjusted for the new SVG positioning (32 - 8 offset)
						borderColor: connections.find(c => c.type === 'straight')?.color || '#3b82f6',
						backgroundColor: commit.parentCommitHashes.filter(h => h.trim()).length > 1 ? '#fbbf24' : (connections.find(c => c.type === 'straight')?.color || '#3b82f6')
					}}
				>
					{commit.parentCommitHashes.filter(h => h.trim()).length > 1 ? (
						<GitMerge className="w-2 h-2 text-white" />
					) : (
						<GitCommit className="w-2 h-2 text-white" />
					)}
				</div>
			</div>

			{/* Commit details */}
			<div className="flex-1 p-0">
				<div
					className="px-3 py-1.5 rounded-md hover:bg-accent/50 hover:shadow-sm transition-all duration-200 cursor-pointer group border border-transparent hover:border-primary/20"
					onClick={handleCommitClick}
					style={{
						borderLeftColor: connections.find(c => c.type === 'straight')?.color || '#3b82f6',
						borderLeftWidth: '3px'
					}}
				>
					<div className="flex items-start justify-between gap-3">
						<div className="flex-1 min-w-0">
							{/* Commit message and refs */}
							<div className="flex items-start gap-2 mb-1">
								<h3 className="font-medium text-sm leading-tight text-foreground truncate flex-1 min-w-0 group-hover:text-primary transition-colors">
									{displayMessage}
								</h3>
								
								{/* Display all refs in a single row with different styles */}
								<div className="flex gap-1 flex-wrap items-center">
									{/* HEAD indicator */}
									{refs.head && (
										<Badge
											variant="default"
											className="text-xs shrink-0 bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
										>
											HEAD
										</Badge>
									)}
									
									{/* Local branches */}
									{refs.localBranches.map((branch, index) => (
										<Badge
											key={`local-${index}`}
											variant="secondary"
											className="text-xs shrink-0 bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
										>
											<GitBranch className="w-3 h-3 mr-1" />
											{branch}
										</Badge>
									))}
									
									{/* Remote branches */}
									{refs.remoteBranches.map((branch, index) => (
										<Badge
											key={`remote-${index}`}
											variant="outline"
											className="text-xs shrink-0 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
										>
											<GitBranch className="w-3 h-3 mr-1" />
											{branch}
										</Badge>
									))}
									
									{/* Tags */}
									{refs.tags.map((tag, index) => (
										<Badge
											key={`tag-${index}`}
											variant="outline"
											className="text-xs shrink-0 bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
										>
											<Tag className="w-3 h-3 mr-1" />
											{tag}
										</Badge>
									))}
								</div>
							</div>

							{/* Author and timestamp */}
							<div className="flex items-center gap-3 text-xs text-muted-foreground overflow-hidden">
								<div className="flex items-center gap-1 truncate">
									<User className="w-3 h-3 flex-shrink-0" />
									<span className="truncate">{commit.username}</span>
								</div>
								<div className="flex items-center gap-1 flex-shrink-0">
									<Calendar className="w-3 h-3" />
									<span>{useUnixTime(commit.commitTimeStamp).toLocaleDateString()}</span>
								</div>
								<div className="flex items-center gap-1 flex-shrink-0">
									<Hash className="w-3 h-3" />
									<code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono group-hover:bg-primary/10 transition-colors">
										{shortHash}
									</code>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

interface ConnectionLineProps {
	connection: Connection;
	fromY: number;
	toY: number;
	columnWidth: number;
}

function ConnectionLine({ connection, fromY, toY, columnWidth }: ConnectionLineProps) {
	const fromX = connection.fromColumn * columnWidth + 16;
	const toX = connection.toColumn * columnWidth + 16;

	if (connection.type === 'straight' && fromX === toX) {
		// Straight line down - this is handled by the main branch line
		return null;
	}

	// Different handling for merge vs branch connections
	if (connection.type === 'merge') {
		// Curved line for merges - smoother, tighter curve
		const deltaY = toY - fromY;
		const deltaX = toX - fromX;
		
		// Control points for a smooth S-curve
		const controlX1 = fromX + deltaX * 0.2;
		const controlX2 = toX - deltaX * 0.2;
		
		const path = `M ${fromX} ${fromY} C ${controlX1} ${fromY + deltaY * 0.3}, ${controlX2} ${fromY + deltaY * 0.7}, ${toX} ${toY}`;

		return (
			<>
				{/* Subtle glow effect for merge lines */}
				<path
					d={path}
					stroke={connection.color}
					strokeWidth="4"
					fill="none"
					opacity="0.1"
					filter="blur(0.5px)"
				/>
				{/* Main merge line */}
				<path
					d={path}
					stroke={connection.color}
					strokeWidth="2"
					fill="none"
					opacity="0.9"
					strokeLinecap="round"
					className="transition-all duration-200"
				/>
			</>
		);
	} else {
		// For branch connections, use a clean curve
		const deltaY = toY - fromY;
		const midY = fromY + deltaY * 0.5;
		
		const path = `M ${fromX} ${fromY} Q ${fromX + (toX - fromX) * 0.5} ${midY} ${toX} ${toY}`;

		return (
			<path
				d={path}
				stroke={connection.color}
				strokeWidth="2"
				fill="none"
				opacity="0.9"
				strokeLinecap="round"
				className="transition-all duration-200"
			/>
		);
	}
}

interface ParsedRefs {
	localBranches: string[];
	remoteBranches: string[];
	tags: string[];
	head: string | null;
}

function parseRefs(refs: string): ParsedRefs {
	if (!refs || refs.trim() === '') {
		return { localBranches: [], remoteBranches: [], tags: [], head: null };
	}

	const localBranches: string[] = [];
	const remoteBranches: string[] = [];
	const tags: string[] = [];
	let head: string | null = null;

	// Parse refs like "(HEAD -> main, origin/main, origin/HEAD)" or "(tag: v1.0.0, main)"
	const refParts = refs
		.replace(/[()]/g, '')
		.split(',')
		.map((r) => r.trim())
		.filter(r => r.length > 0);

	for (const ref of refParts) {
		if (ref.startsWith('tag:')) {
			// Handle tags like "tag: v1.0.0"
			tags.push(ref.substring(4).trim());
		} else if (ref.startsWith('HEAD ->')) {
			// Handle "HEAD -> branch-name"
			const branchName = ref.substring(7).trim();
			head = branchName;
			if (!localBranches.includes(branchName)) {
				localBranches.push(branchName);
			}
		} else if (ref.includes('/')) {
			// Handle remote refs like "origin/main", "upstream/develop"
			if (!remoteBranches.includes(ref)) {
				remoteBranches.push(ref);
			}
		} else if (ref && ref !== 'HEAD') {
			// Handle local branch refs
			if (!localBranches.includes(ref)) {
				localBranches.push(ref);
			}
		}
	}

	return { localBranches, remoteBranches, tags, head };
}
