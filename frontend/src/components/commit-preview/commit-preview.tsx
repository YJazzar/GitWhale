import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useDetailedCommit } from '@/hooks/git-log/use-detailed-commit';
import { useNavigateToCommitDiffs } from '@/hooks/git-diff/use-navigate-commit-diffs';
import { Logger } from '@/utils/logger';
import { AlertCircle, GitCompareArrows, X } from 'lucide-react';
import { CommitHash } from '../commit-hash';
import { CommitAuthorInfo } from './commit-author-info';
import { CommitMessage } from './commit-message';
import { CommitRefs } from './commit-refs';
import { CommitFileList } from './commit-file-list';
import { CommitParents } from './commit-parents';

interface CommitPreviewProps {
	commitHash: string;
	repoPath: string;
	onClose?: () => void;
}

export function CommitPreview({ commitHash, repoPath, onClose }: CommitPreviewProps) {
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

	const isMergeCommit = (commit?.parentCommitHashes?.length || 0) > 1;

	const handleViewDiff = () => {
		navigateToCommitDiff(commitHash, undefined);
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
					{/* Author Information */}
					<CommitAuthorInfo commit={commit} />

					{/* Commit Message */}
					<CommitMessage commit={commit} />

					{/* Refs (branches and tags) */}
					<CommitRefs commit={commit} />

					{/* File List */}
					<CommitFileList commit={commit} />

					{/* Parent Commits */}
					<CommitParents commit={commit} repoPath={repoPath} />
				</CardContent>
			</ScrollArea>
		</div>
	);
}
