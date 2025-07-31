import React from 'react';
import { backend } from 'wailsjs/go/models';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { GitBranch, GitCommit, GitMerge, User, Calendar, Hash } from 'lucide-react';
import { Link } from 'react-router';

interface Connection {
	fromColumn: number;
	toColumn: number;
	type: 'straight' | 'merge' | 'branch';
}

interface CommitNodeProps {
	commit: backend.GitLogCommitInfo;
	branchColumn: number;
	connections: Connection[];
	isFirst: boolean;
	isLast: boolean;
	onCommitClick?: (commitHash: string) => void;
	generateCommitPageUrl?: (commitHash: string) => string;
}

export function CommitNode({
	commit,
	branchColumn,
	connections,
	isFirst,
	isLast,
	onCommitClick,
	generateCommitPageUrl
}: CommitNodeProps) {
	const handleCommitClick = () => {
		onCommitClick?.(commit.commitHash);
	};

	const commitUrl = generateCommitPageUrl?.(commit.commitHash);
	const shortHash = commit.commitHash.slice(0, 7);
	const commitMessage = Array.isArray(commit.commitMessage) 
		? commit.commitMessage.join('\n') 
		: commit.commitMessage;
	
	// For display, only show the first line and truncate to 75 characters
	const firstLine = commitMessage.split('\n')[0];
	const displayMessage = firstLine.length > 75 
		? firstLine.slice(0, 75) + '...' 
		: firstLine;
	
	// Check if we should show tooltip (multi-line or truncated first line)
	const shouldShowTooltip = commitMessage.includes('\n') || firstLine.length > 75;

	// Parse refs to identify branches and tags
	const refs = parseRefs(commit.refs);

	// Calculate the left padding based on branch column
	const leftPadding = branchColumn * 30; // 30px per column

	return (
		<div className="relative flex items-start py-1">
			{/* Graph visualization area */}
			<div className="relative flex-shrink-0" style={{ width: Math.max(100, (branchColumn + 1) * 30 + 60) }}>
				{/* Connection lines */}
				<svg 
					className="absolute inset-0 w-full h-full pointer-events-none"
					style={{ height: '80px' }}
				>
					{!isFirst && (
						<line
							x1={leftPadding + 15}
							y1={0}
							x2={leftPadding + 15}
							y2={40}
							stroke="currentColor"
							strokeWidth="2"
							className="text-muted-foreground/60"
						/>
					)}
					
					{connections.map((connection, index) => (
						<ConnectionLine
							key={index}
							connection={connection}
							fromY={40}
							toY={80}
							columnWidth={30}
						/>
					))}
					
					{!isLast && (
						<line
							x1={leftPadding + 15}
							y1={40}
							x2={leftPadding + 15}
							y2={80}
							stroke="currentColor"
							strokeWidth="2"
							className="text-muted-foreground/60"
						/>
					)}
				</svg>

				{/* Commit dot */}
				<div 
					className="absolute z-10 w-4 h-4 rounded-full border-2 border-primary bg-background flex items-center justify-center shadow-sm"
					style={{ 
						left: leftPadding + 7, 
						top: 32 
					}}
				>
					{commit.parentCommitHashes.length > 1 ? (
						<GitMerge className="w-2 h-2 text-primary" />
					) : (
						<GitCommit className="w-2 h-2 text-primary" />
					)}
				</div>
			</div>

			{/* Commit details */}
			<div className="flex-1 p-0">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20 cursor-pointer">
								<CardContent className="p-2">
									<div className="flex items-start justify-between gap-3">
										<div className="flex-1 min-w-0">
											{/* Commit message and refs */}
											<div className="flex items-start gap-2 mb-2">
												<h3 className="font-medium text-sm leading-tight text-foreground truncate flex-1 min-w-0">
													{displayMessage}
												</h3>
												{refs.branches.length > 0 && (
													<div className="flex gap-1 flex-wrap">
														{refs.branches.map((branch, index) => (
															<Badge key={index} variant="secondary" className="text-xs shrink-0">
																<GitBranch className="w-3 h-3 mr-1" />
																{branch}
															</Badge>
														))}
													</div>
												)}
												{refs.tags.length > 0 && (
													<div className="flex gap-1 flex-wrap">
														{refs.tags.map((tag, index) => (
															<Badge key={index} variant="outline" className="text-xs shrink-0">
																{tag}
															</Badge>
														))}
													</div>
												)}
											</div>

											{/* Author and timestamp */}
											<div className="flex items-center gap-3 text-xs text-muted-foreground overflow-hidden">
												<div className="flex items-center gap-1 truncate">
													<User className="w-3 h-3 flex-shrink-0" />
													<span className="truncate">{commit.username}</span>
												</div>
												<div className="flex items-center gap-1 flex-shrink-0">
													<Calendar className="w-3 h-3" />
													<span>{new Date(commit.commitTimeStamp).toLocaleDateString()}</span>
												</div>
												<div className="flex items-center gap-1 flex-shrink-0">
													<Hash className="w-3 h-3" />
													<code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{shortHash}</code>
												</div>
											</div>
										</div>

										{/* Actions */}
										<div className="flex items-center gap-2 flex-shrink-0">
											{commitUrl ? (
												<Button asChild size="sm" variant="outline" className="h-7 px-2">
													<Link to={commitUrl} onClick={handleCommitClick}>
														View
													</Link>
												</Button>
											) : (
												<Button size="sm" variant="outline" onClick={handleCommitClick} className="h-7 px-2">
													View
												</Button>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						</TooltipTrigger>
						{(commit.shortStat || shouldShowTooltip) && (
							<TooltipContent side="left" className="max-w-sm">
								<div className="text-sm">
									{shouldShowTooltip && (
										<div className="mb-2">
											<div className="font-semibold mb-1">Full message:</div>
											<pre className="font-mono whitespace-pre-wrap">{commitMessage}</pre>
										</div>
									)}
									{commit.shortStat && (
										<div>
											<div className="font-semibold mb-1">Changes:</div>
											<div className="font-mono">{commit.shortStat}</div>
										</div>
									)}
								</div>
							</TooltipContent>
						)}
					</Tooltip>
				</TooltipProvider>
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
	const fromX = connection.fromColumn * columnWidth + 15;
	const toX = connection.toColumn * columnWidth + 15;

	if (connection.type === 'straight' && fromX === toX) {
		// Straight line down
		return (
			<line
				x1={fromX}
				y1={fromY}
				x2={toX}
				y2={toY}
				stroke="currentColor"
				strokeWidth="2"
				className="text-primary"
			/>
		);
	}

	// Curved line for merges and branches
	const midY = fromY + (toY - fromY) / 2;
	const path = `M ${fromX} ${fromY} Q ${fromX} ${midY} ${toX} ${toY}`;
	
	return (
		<path
			d={path}
			stroke="currentColor"
			strokeWidth="2"
			fill="none"
			className={cn(
				connection.type === 'merge' ? 'text-orange-500' : 'text-blue-500'
			)}
		/>
	);
}

interface ParsedRefs {
	branches: string[];
	tags: string[];
}

function parseRefs(refs: string): ParsedRefs {
	if (!refs || refs.trim() === '') {
		return { branches: [], tags: [] };
	}

	const branches: string[] = [];
	const tags: string[] = [];

	// Parse refs like "(origin/main, main)" or "(tag: v1.0.0)"
	const refParts = refs.replace(/[()]/g, '').split(',').map(r => r.trim());
	
	for (const ref of refParts) {
		if (ref.startsWith('tag:')) {
			tags.push(ref.substring(4).trim());
		} else if (ref && !ref.includes('/') || ref.startsWith('origin/')) {
			branches.push(ref);
		}
	}

	return { branches, tags };
}
