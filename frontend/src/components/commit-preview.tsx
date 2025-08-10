import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useDetailedCommit } from '@/hooks/git-log/use-detailed-commit';
import { useNavigateToCommitDiffs } from '@/hooks/git-diff/use-navigate-commit-diffs';
import { useUnixTime } from '@/hooks/use-unix-time';
import { Logger } from '@/utils/logger';
import {
	AlertCircle,
	Calendar,
	Clock,
	Copy,
	ExternalLink,
	FileText,
	GitCompareArrows,
	Hash,
	Plus,
	Minus,
	Edit,
	Trash2,
	User,
	X
} from 'lucide-react';
import { CommitHash } from './commit-hash';
import { GitRefs } from './git-refs';

interface CommitPreviewProps {
	commitHash: string;
	repoPath: string;
	onClose?: () => void;
}

export function CommitPreview({
	commitHash,
	repoPath,
	onClose,
}: CommitPreviewProps) {
	const { data: commit, isLoading, isError, error } = useDetailedCommit(repoPath, commitHash);
	const { navigateToCommitDiff } = useNavigateToCommitDiffs(repoPath);

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

	const commitMessage = Array.isArray(commit?.commitMessage)
		? commit.commitMessage.join('\n')
		: commit?.commitMessage;

	const isMergeCommit = (commit?.parentCommitHashes?.length || 0) > 1;

	const handleViewDiff = () => {
		navigateToCommitDiff(commitHash, undefined);
	};

	const getFileStatusInfo = (status: string) => {
		switch (status) {
			case 'A':
				return { label: 'Added', icon: Plus, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
			case 'M':
				return { label: 'Modified', icon: Edit, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
			case 'D':
				return { label: 'Deleted', icon: Trash2, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
			case 'R':
				return { label: 'Renamed', icon: Edit, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' };
			case 'C':
				return { label: 'Copied', icon: Copy, color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' };
			default:
				return { label: status, icon: FileText, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' };
		}
	};

	return (
		<div className="h-full flex flex-col border-t bg-background">
			{/* Header */}
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex-1 min-w-0">
						<CardTitle className="text-lg flex items-center gap-2">
							<CommitHash repoPath={repoPath} commitHash={commitHash} isMerge={isMergeCommit} />
						</CardTitle>
					</div>
					<div className="flex items-center gap-2">
						<Button onClick={handleViewDiff} size="sm" variant="outline">
							<GitCompareArrows className="w-4 h-4 mr-1" />
							View Diff
						</Button>
						{onClose && (
							<Button onClick={onClose} variant="ghost" size="sm">
								<X className="w-4 h-4" />
							</Button>
						)}
					</div>
				</div>
			</CardHeader>

			<ScrollArea className="flex-1">
				<CardContent className="space-y-6">
					{/* Author Information - Top Priority */}
					<div className="space-y-3">
						<div className="grid grid-cols-4 gap-4">
							<div className="space-y-2">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<User className="w-4 h-4" />
									<span className="font-medium">Author</span>
								</div>
								<div className="pl-6 space-y-1">
									<div className="font-mono text-sm">{commit.username}</div>
									<div className="text-xs text-muted-foreground">{commit.userEmail}</div>
								</div>
							</div>
							<div className="space-y-2">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Calendar className="w-4 h-4" />
									<span className="font-medium">Author Date</span>
								</div>
								<div className="pl-6">
									<div className="text-sm">
										{useUnixTime(commit.authoredTimeStamp).toLocaleDateString()}
									</div>
									<div className="text-xs text-muted-foreground">
										{useUnixTime(commit.authoredTimeStamp).toLocaleTimeString()}
									</div>
								</div>
							</div>
							<div className="space-y-2">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Hash className="w-4 h-4" />
									<span className="font-medium">Committer</span>
								</div>
								<div className="pl-6 space-y-1">
									<div className="font-mono text-sm">{commit.committerName || commit.username}</div>
									<div className="text-xs text-muted-foreground">{commit.committerEmail || commit.userEmail}</div>
								</div>
							</div>
							<div className="space-y-2">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Clock className="w-4 h-4" />
									<span className="font-medium">Commit Date</span>
								</div>
								<div className="pl-6">
									<div className="text-sm">
										{useUnixTime(commit.commitTimeStamp).toLocaleDateString()}
									</div>
									<div className="text-xs text-muted-foreground">
										{useUnixTime(commit.commitTimeStamp).toLocaleTimeString()}
									</div>
								</div>
							</div>
						</div>
					</div>

					<Separator />

					{/* Commit Message - Preserve Whitespace */}
					{commitMessage && (
						<div className="space-y-2">
							<h4 className="text-sm font-medium text-muted-foreground">Commit Message</h4>
							<Card>
								<CardContent className="p-4">
									<pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
										{commitMessage}
									</pre>
								</CardContent>
							</Card>
						</div>
					)}

					{/* Refs (branches and tags) */}
					{commit.refs && commit.refs.trim() !== '' && (
						<div className="space-y-2">
							<h4 className="text-sm font-medium text-muted-foreground">Branches & Tags</h4>
							<GitRefs refs={commit.refs} size="sm" showHead={true} />
						</div>
					)}

					<Separator />

					{/* File Changes Summary */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<h4 className="text-sm font-medium text-muted-foreground">Changes Summary</h4>
							<div className="flex items-center gap-3 text-sm">
								<Badge variant="secondary">
									{commit.commitStats.filesChanged} files
								</Badge>
								<Badge variant="outline" className="text-green-600 border-green-200">
									<Plus className="w-3 h-3 mr-1" />
									{commit.commitStats.linesAdded}
								</Badge>
								<Badge variant="outline" className="text-red-600 border-red-200">
									<Minus className="w-3 h-3 mr-1" />
									{commit.commitStats.linesDeleted}
								</Badge>
							</div>
						</div>

						{/* Short Stat */}
						{commit.shortStat && (
							<div className="text-xs text-muted-foreground font-mono bg-muted/50 px-3 py-2 rounded">
								{commit.shortStat}
							</div>
						)}
					</div>

					{/* File List - Accurate categorization */}
					{commit.changedFiles && commit.changedFiles.length > 0 && (
						<div className="space-y-3">
							<h4 className="text-sm font-medium text-muted-foreground">
								Files Changed ({commit.changedFiles.length})
							</h4>
							
							<div className="space-y-2">
								{commit.changedFiles.map((file, index) => {
									const statusInfo = getFileStatusInfo(file.status);
									const StatusIcon = statusInfo.icon;

									return (
										<div
											key={index}
											className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
										>
											<div className="flex items-center gap-3 flex-1 min-w-0">
												<Badge 
													variant="outline" 
													className={`flex items-center gap-1 ${statusInfo.color} border-0 font-mono text-xs px-2 py-1`}
												>
													<StatusIcon className="w-3 h-3" />
													{file.status}
												</Badge>
												
												<div className="flex-1 min-w-0">
													<div className="font-mono text-sm truncate">
														{file.path}
													</div>
													{file.oldPath && file.oldPath !== file.path && (
														<div className="text-xs text-muted-foreground font-mono">
															from: {file.oldPath}
														</div>
													)}
												</div>
												
												{file.binaryFile && (
													<Badge variant="secondary" className="text-xs">
														Binary
													</Badge>
												)}
											</div>

											{!file.binaryFile && (
												<div className="flex items-center gap-2 text-xs font-mono">
													<span className="text-green-600 flex items-center gap-1">
														<Plus className="w-3 h-3" />
														{file.linesAdded}
													</span>
													<span className="text-red-600 flex items-center gap-1">
														<Minus className="w-3 h-3" />
														{file.linesDeleted}
													</span>
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* Parent Commits */}
					{commit.parentCommitHashes && commit.parentCommitHashes.length > 0 && (
						<div className="space-y-3">
							<Separator />
							<div className="space-y-2">
								<h4 className="text-sm font-medium text-muted-foreground">
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
						</div>
					)}
				</CardContent>
			</ScrollArea>
		</div>
	);
}