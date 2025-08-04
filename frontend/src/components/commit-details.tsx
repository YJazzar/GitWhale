import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useUnixTime } from '@/hooks/use-unix-time';
import { useDetailedCommit } from '@/hooks/use-detailed-commit';
import {
	Calendar,
	ExternalLink,
	Hash,
	User,
	FileText,
	GitBranch,
	AlertCircle,
	Copy,
	Database,
	Shield,
} from 'lucide-react';
import { backend } from 'wailsjs/go/models';
import { CommitHash } from './commit-hash';
import { useNavigateToCommit } from '@/hooks/use-navigate-to-commit';
import { GitRefs } from './git-refs';
import { useState, useEffect } from 'react';

interface CommitDetailsProps {
	commitHash: string;
	repoPath: string;
	onClose?: () => void;
	variant?: 'compact' | 'full';
	hideViewFullButton?: boolean; // Optional prop to hide the View Full Commit button
}

export function CommitDetails({
	commitHash,
	repoPath,
	onClose,
	variant = 'full',
	hideViewFullButton = false,
}: CommitDetailsProps) {
	const { data: commit, isLoading, isError, error } = useDetailedCommit(repoPath, commitHash);

	// Initialize diff toggle state from localStorage, default to true (open)
	const [showFullDiff, setShowFullDiff] = useState(() => {
		const saved = localStorage.getItem('commit-details-show-diff');
		return saved !== null ? JSON.parse(saved) : true;
	});

	// Save diff toggle state to localStorage
	useEffect(() => {
		localStorage.setItem('commit-details-show-diff', JSON.stringify(showFullDiff));
	}, [showFullDiff]);

	// Early return if required props are missing
	if (!commitHash || !repoPath || repoPath.trim() === '') {
		return (
			<div className="h-full flex flex-col border-t bg-background">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-destructive">
						<AlertCircle className="h-5 w-5" />
						Invalid Parameters
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground mb-4">
						Both commit hash and repository path are required.
					</p>
					{onClose && (
						<Button onClick={onClose} variant="outline">
							Close
						</Button>
					)}
				</CardContent>
			</div>
		);
	}

	const commitMessage = Array.isArray(commit?.commitMessage)
		? commit.commitMessage.join('\n')
		: commit?.commitMessage;

	const isMergeCommit = (commit?.parentCommitHashes?.length || 0) > 1;
	const handleViewFullCommit = useNavigateToCommit(commitHash, repoPath, isMergeCommit);

	// Loading state
	if (isLoading) {
		return (
			<div className="h-full flex flex-col border-t bg-background p-4">
				<div className="space-y-4">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-32 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			</div>
		);
	}

	// Error state
	if (isError || !commit) {
		return (
			<div className="h-full flex flex-col border-t bg-background">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-destructive">
						<AlertCircle className="h-5 w-5" />
						Error Loading Commit
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground mb-4">
						{error?.message ||
							`Failed to load commit details for ${
								commitHash?.slice(0, 7) || 'unknown commit'
							}`}
					</p>
					{onClose && (
						<Button onClick={onClose} variant="outline">
							Close
						</Button>
					)}
				</CardContent>
			</div>
		);
	}

	const copyToClipboard = (text: string, label: string) => {
		navigator.clipboard.writeText(text);
		// You could add a toast notification here
		console.log(`Copied ${label}: ${text}`);
	};

	// Parse diff content for syntax highlighting
	const parseDiffLine = (line: string) => {
		if (line.startsWith('@@')) {
			return { type: 'hunk', content: line };
		} else if (line.startsWith('+++') || line.startsWith('---')) {
			return { type: 'header', content: line };
		} else if (line.startsWith('+')) {
			return { type: 'addition', content: line };
		} else if (line.startsWith('-')) {
			return { type: 'deletion', content: line };
		} else if (line.startsWith('diff --git') || line.startsWith('index ')) {
			return { type: 'meta', content: line };
		} else {
			return { type: 'context', content: line };
		}
	};

	const renderDiffContent = (diffContent: string) => {
		const lines = diffContent.split('\n');
		return lines.map((line, index) => {
			const parsed = parseDiffLine(line);
			let className = 'block';

			switch (parsed.type) {
				case 'addition':
					className +=
						' bg-green-100/50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-l-2 border-green-500 pl-2';
					break;
				case 'deletion':
					className +=
						' bg-red-100/50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-l-2 border-red-500 pl-2';
					break;
				case 'hunk':
					className +=
						' bg-blue-100/50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 font-medium';
					break;
				case 'header':
					className += ' bg-muted/50 text-muted-foreground font-medium';
					break;
				case 'meta':
					className += ' text-muted-foreground/70 font-medium';
					break;
				default:
					className += ' text-muted-foreground';
			}

			return (
				<span key={index} className={className}>
					{parsed.content || '\u00A0'}
				</span>
			);
		});
	};

	// Render compact version for RepoLogView
	if (variant === 'compact') {
		return (
			<div className="h-full flex flex-col border-t bg-background">
				<CardHeader className="pb-2">
					<div className="flex items-start justify-between">
						<div className="flex-1 min-w-0">
							<CardTitle className="text-base flex items-center gap-2">
								<CommitHash commitHash={commitHash} isMerge={isMergeCommit} />
							</CardTitle>
						</div>
						<div className="flex items-center gap-2">
							{!hideViewFullButton && (
								<Button onClick={handleViewFullCommit} size="sm" variant="outline">
									<ExternalLink className="w-4 h-4 mr-1" />
									Full View
								</Button>
							)}
							{onClose && (
								<Button onClick={onClose} variant="ghost" size="sm">
									Close
								</Button>
							)}
						</div>
					</div>
				</CardHeader>

				<ScrollArea className="flex-1">
					<CardContent className="space-y-3">
						{/* Commit Message */}
						{commitMessage && (
							<div className="space-y-1">
								<h4 className="text-sm font-medium text-muted-foreground">Message</h4>
								<Card>
									<CardContent className="p-2">
										<pre className="font-mono text-xs whitespace-pre-wrap">
											{commitMessage}
										</pre>
									</CardContent>
								</Card>
							</div>
						)}

						{/* Author Info - Compact */}
						<div className="space-y-1">
							<h4 className="text-sm font-medium text-muted-foreground">Author</h4>
							<div className="flex items-center gap-2 text-sm">
								<span className="font-mono">{commit.username}</span>
								<span className="text-muted-foreground">•</span>
								<span className="text-xs text-muted-foreground">
									{useUnixTime(commit.authoredTimeStamp).toLocaleDateString()}
								</span>
							</div>
						</div>

						{/* Refs (branches and tags) */}
						{commit.refs && commit.refs.trim() !== '' && (
							<div className="space-y-1">
								<h4 className="text-sm font-medium text-muted-foreground">Branches & Tags</h4>
								<GitRefs refs={commit.refs} size="sm" showHead={true} />
							</div>
						)}

						{/* Compact File Changes Statistics */}
						<div className="space-y-1">
							<h4 className="text-sm font-medium text-muted-foreground">Changes</h4>
							<div className="flex items-center gap-3 text-sm">
								<span className="text-blue-600 font-medium">
									{commit.commitStats.filesChanged} files
								</span>
								<span className="text-green-600 font-medium">
									+{commit.commitStats.linesAdded}
								</span>
								<span className="text-red-600 font-medium">
									-{commit.commitStats.linesDeleted}
								</span>
							</div>
						</div>

						{/* Changed Files List - Complete */}
						{commit.changedFiles && commit.changedFiles.length > 0 && (
							<div className="space-y-1">
								<h4 className="text-sm font-medium text-muted-foreground">
									Files ({commit.changedFiles.length})
								</h4>
								<Card>
									<CardContent className="p-0">
										<div className="max-h-48 overflow-y-auto">
											{commit.changedFiles.map((file, index) => (
												<div
													key={index}
													className="flex items-center justify-between p-2 border-b last:border-b-0 hover:bg-muted/30 text-xs"
												>
													<div className="flex items-center gap-2 flex-1 min-w-0">
														<span
															className={`px-1.5 py-0.5 rounded text-xs font-mono ${
																file.status === 'M'
																	? 'bg-blue-100 text-blue-800'
																	: file.status === 'A'
																	? 'bg-green-100 text-green-800'
																	: file.status === 'D'
																	? 'bg-red-100 text-red-800'
																	: 'bg-gray-100 text-gray-800'
															}`}
														>
															{file.status}
														</span>
														<span className="truncate font-mono">
															{file.path}
														</span>
														{file.binaryFile && (
															<span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
																Binary
															</span>
														)}
													</div>
													{!file.binaryFile && (
														<div className="flex items-center gap-1 text-xs">
															<span className="text-green-600">
																+{file.linesAdded}
															</span>
															<span className="text-red-600">
																-{file.linesDeleted}
															</span>
														</div>
													)}
												</div>
											))}
										</div>
									</CardContent>
								</Card>
							</div>
						)}
					</CardContent>
				</ScrollArea>
			</div>
		);
	}

	// Render full version for sidebar
	return (
		<div className="h-full flex flex-col border-t bg-background">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex-1 min-w-0">
						<CardTitle className="text-lg flex items-center gap-2">
							<div className="mt-2">
								<CommitHash commitHash={commitHash} isMerge={isMergeCommit} />
							</div>
						</CardTitle>
					</div>
					<div className="flex flex-col items-end gap-2">
						{/* Action Buttons */}
						<div className="flex items-center gap-2 mt-2">
							{!hideViewFullButton && (
								<Button onClick={handleViewFullCommit} size="sm">
									<ExternalLink className="w-4 h-4 mr-2" />
									View Full Commit
								</Button>
							)}
							{onClose && (
								<Button onClick={onClose} variant="outline" size="sm">
									Close
								</Button>
							)}
						</div>
					</div>
				</div>
			</CardHeader>

			<ScrollArea className="flex-1">
				<CardContent className="space-y-6">
					{/* Commit Message */}
					{commitMessage && (
						<div className="space-y-2">
							<h4 className="text-sm font-medium text-muted-foreground">Message</h4>
							<Card>
								<CardContent className="p-3">
									<pre className="font-mono text-xs whitespace-pre-wrap">
										{commitMessage}
									</pre>
								</CardContent>
							</Card>
						</div>
					)}

					{/* Author and Committer Info - Simplified */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-3">
							<h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
								<User className="w-3 h-3" />
								Author
							</h4>
							<div className="text-sm space-y-1">
								<div className="flex items-center gap-1">
									<span className="text-muted-foreground text-xs w-12">name</span>
									<span className="font-mono">{commit.username}</span>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => copyToClipboard(commit.username, 'Author name')}
										className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
									>
										<Copy className="w-3 h-3" />
									</Button>
								</div>
								<div className="flex items-center gap-1">
									<span className="text-muted-foreground text-xs w-12">email</span>
									<span className="font-mono text-xs">{commit.userEmail}</span>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => copyToClipboard(commit.userEmail, 'Author email')}
										className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
									>
										<Copy className="w-3 h-3" />
									</Button>
								</div>
								<div className="flex items-center gap-1">
									<span className="text-muted-foreground text-xs w-12">date</span>
									<span className="text-sm">
										{useUnixTime(commit.authoredTimeStamp).toLocaleString()}
									</span>
								</div>
							</div>
						</div>

						<div className="space-y-3">
							<h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
								<GitBranch className="w-3 h-3" />
								Committer
							</h4>
							<div className="text-sm space-y-1">
								<div className="flex items-center gap-1">
									<span className="text-muted-foreground text-xs w-12">name</span>
									<span className="font-mono">{commit.committerName}</span>
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											copyToClipboard(commit.committerName, 'Committer name')
										}
										className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
									>
										<Copy className="w-3 h-3" />
									</Button>
								</div>
								<div className="flex items-center gap-1">
									<span className="text-muted-foreground text-xs w-12">email</span>
									<span className="font-mono text-xs">{commit.committerEmail}</span>
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											copyToClipboard(commit.committerEmail, 'Committer email')
										}
										className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
									>
										<Copy className="w-3 h-3" />
									</Button>
								</div>
								<div className="flex items-center gap-1">
									<span className="text-muted-foreground text-xs w-12">date</span>
									<span className="text-sm">
										{useUnixTime(commit.commitTimeStamp).toLocaleString()}
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* Compact Metadata */}
					<div className="space-y-3">
						<h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
							<Database className="w-3 h-3" />
							Metadata
						</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
							<div className="flex items-center gap-1">
								<span className="text-muted-foreground text-xs w-16">tree</span>
								<code className="bg-muted px-2 py-1 rounded text-xs font-mono">
									{commit.treeHash.slice(0, 12)}...
								</code>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => copyToClipboard(commit.treeHash, 'Tree hash')}
									className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
								>
									<Copy className="w-3 h-3" />
								</Button>
							</div>
							<div className="flex items-center gap-1">
								<span className="text-muted-foreground text-xs w-16">size</span>
								<span className="text-sm">{commit.commitSize} bytes</span>
							</div>
							<div className="flex items-center gap-1">
								<span className="text-muted-foreground text-xs w-16">encoding</span>
								<span className="text-sm">{commit.encoding}</span>
							</div>
							{commit.gpgSignature &&
								commit.gpgSignature !== 'Not signed or verification failed' && (
									<div className="flex items-center gap-1">
										<span className="text-muted-foreground text-xs w-16">gpg</span>
										<Shield className="w-3 h-3 text-green-500" />
										<span className="text-green-600 text-sm">Signed</span>
									</div>
								)}
						</div>
					</div>

					{/* Parent Commits */}
					{commit.parentCommitHashes && commit.parentCommitHashes.length > 0 && (
						<div className="space-y-2">
							<h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
								<Hash className="w-3 h-3" />
								Parent Commits ({commit.parentCommitHashes.length})
							</h4>
							<div className="flex flex-wrap gap-2">
								{commit.parentCommitHashes.map((parentHash, index) => (
									<CommitHash
										key={index}
										commitHash={parentHash}
										shortHash={true}
										showIcon={false}
										className="flex-shrink-0"
										repoPath={repoPath}
									/>
								))}
							</div>
						</div>
					)}

					{/* Refs (branches and tags) */}
					{commit.refs && commit.refs.trim() !== '' && (
						<div className="space-y-2">
							<h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
								<GitBranch className="w-3 h-3" />
								Branches & Tags
							</h4>
							<GitRefs refs={commit.refs} size="md" showHead={true} />
						</div>
					)}

					{/* File Changes Statistics - Compact */}
					<div className="space-y-2">
						<h4 className="text-sm font-medium text-muted-foreground">Changes Summary</h4>
						<div className="flex items-center gap-4 text-sm">
							<span className="text-blue-600 font-medium">
								{commit.commitStats.filesChanged} files
							</span>
							<span className="text-green-600 font-medium">
								+{commit.commitStats.linesAdded} added
							</span>
							<span className="text-red-600 font-medium">
								-{commit.commitStats.linesDeleted} deleted
							</span>
						</div>
						{commit.shortStat && (
							<p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
								{commit.shortStat}
							</p>
						)}
					</div>

					{/* Changed Files */}
					{commit.changedFiles && commit.changedFiles.length > 0 && (
						<div className="space-y-3">
							<h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
								<FileText className="w-3 h-3" />
								Changed Files ({commit.changedFiles.length})
							</h4>
							<Card>
								<CardContent className="p-0">
									<div className="max-h-64 overflow-y-auto">
										{commit.changedFiles.map((file, index) => (
											<div
												key={index}
												className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-muted/30"
											>
												<div className="flex items-center gap-2 flex-1 min-w-0">
													<span
														className={`text-xs px-2 py-1 rounded font-mono ${
															file.status === 'M'
																? 'bg-blue-100 text-blue-800'
																: file.status === 'A'
																? 'bg-green-100 text-green-800'
																: file.status === 'D'
																? 'bg-red-100 text-red-800'
																: 'bg-gray-100 text-gray-800'
														}`}
													>
														{file.status}
													</span>
													<span className="truncate font-mono text-sm">
														{file.path}
													</span>
													{file.binaryFile && (
														<span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
															Binary
														</span>
													)}
												</div>
												{!file.binaryFile && (
													<div className="flex items-center gap-2 text-sm">
														<span className="text-green-600">
															+{file.linesAdded}
														</span>
														<span className="text-red-600">
															-{file.linesDeleted}
														</span>
													</div>
												)}
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						</div>
					)}

					{/* Full Diff */}
					{commit.fullDiff && (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
									<FileText className="w-3 h-3" />
									Full Diff
								</h4>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowFullDiff(!showFullDiff)}
								>
									{showFullDiff ? 'Collapse' : 'Expand'} Diff
								</Button>
							</div>
							{showFullDiff && (
								<div className="font-mono text-xs bg-muted p-4 rounded max-h-96 overflow-y-auto">
									{renderDiffContent(commit.fullDiff)}
								</div>
							)}
						</div>
					)}
				</CardContent>
			</ScrollArea>
		</div>
	);
}
