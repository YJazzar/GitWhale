import { CommitHash } from '@/components/commit-hash';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigateToCommit } from '@/hooks/navigation/use-navigate-to-commit';
import { useRepoHomeState } from '@/hooks/state/repo/use-git-home-state';
import { convertUnixTimeToDate } from '@/hooks/use-unix-time';
import { ArrowRight, Calendar, GitCommit, GitMerge, History } from 'lucide-react';
import { git_operations } from 'wailsjs/go/models';

interface RecentCommitsProps {
	repoPath: string;
}

export function RecentCommits(props: RecentCommitsProps) {
	const { repoPath } = props;
	const { recentCommits } = useRepoHomeState(repoPath);
	const handleViewFullCommit = useNavigateToCommit(repoPath);

	const isLoading = recentCommits.isLoading;

	const onCommitClick = (commitData: git_operations.GitLogCommitInfo) => {
		handleViewFullCommit(commitData.commitHash, commitData.parentCommitHashes.length > 1);
	};

	return (
		<Card className="h-full flex flex-col">
			<CardHeader className="pb-3 shrink-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					<History className="h-4 w-4" />
					Recent Commits
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-0 flex-1 min-h-0 overflow-y-auto">
				{isLoading ? (
					<div className="space-y-2">
						{Array.from({ length: 5 }).map((_, index) => (
							<div key={index} className="flex items-start gap-2.5 p-2.5 rounded-lg">
								<Skeleton className="h-3.5 w-3.5 mt-0.5 rounded-sm shrink-0" />
								<div className="flex-1 min-w-0 space-y-1">
									<Skeleton className="h-4 w-full" />
									<div className="flex items-center gap-2">
										<Skeleton className="h-3 w-16" />
										<span>•</span>
										<Skeleton className="h-3 w-20" />
										<span>•</span>
										<Calendar className="h-3 w-3" />
										<Skeleton className="h-3 w-16" />
									</div>
								</div>
								<Skeleton className="h-3.5 w-3.5 rounded-sm" />
							</div>
						))}
					</div>
				) : (
					<div className="space-y-2">
						{(recentCommits.value || []).map((commit, index) => (
							<div
								key={index}
								className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
								onClick={() => onCommitClick(commit)}
							>
								{commit.parentCommitHashes.length > 1 ? (
									<GitMerge className="h-3.5 w-3.5 mt-0.5 text-purple-500 shrink-0" />
								) : (
									<GitCommit className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />
								)}

								<div className="flex-1 min-w-0 space-y-1">
									<p className="text-sm font-medium leading-tight truncate group-hover:text-primary">
										{commit.commitMessage}
									</p>
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<CommitHash
											commitHash={commit.commitHash}
											isMerge={commit.parentCommitHashes.length > 1}
											repoPath={repoPath}
											shortHash={true}
											showIcon={false}
											enableCopyHash={true}
										/>
										<span>•</span>
										<span>{commit.username}</span>
										<span>•</span>
										<Calendar className="h-3 w-3" />
										<span>
											{convertUnixTimeToDate(
												commit.commitTimeStamp
											).toLocaleDateString()}
										</span>
									</div>
								</div>
								<ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
