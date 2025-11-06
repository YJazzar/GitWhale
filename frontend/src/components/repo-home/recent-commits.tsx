import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigateToCommit } from '@/hooks/navigation/use-navigate-to-commit';
import { useRepoHomeState } from '@/hooks/state/repo/use-git-home-state';
import { Calendar, History } from 'lucide-react';
import { D3GitGraph } from '../git-log/d3-git-graph';

interface RecentCommitsProps {
	repoPath: string;
}

export function RecentCommits(props: RecentCommitsProps) {
	const { repoPath } = props;
	const { recentCommits } = useRepoHomeState(repoPath, false);
	const handleViewFullCommit = useNavigateToCommit(repoPath);

	const isLoading = recentCommits.isLoading;

	const onCommitClick = (commitHash: string) => {
		const commitData = recentCommits.value?.find((c) => c.commitHash === commitHash);
		handleViewFullCommit(commitHash, (commitData?.parentCommitHashes.length || 0) > 1);
	};

	return (
		<Card className="h-full flex flex-col">
			<CardHeader className="pb-3 shrink-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					<History className="h-4 w-4" />
					Recent Commits
				</CardTitle>
			</CardHeader>
			<CardContent className="p-0 flex-1 min-h-0 overflow-y-auto">
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
						<D3GitGraph
							commits={recentCommits.value || []}
							onCommitClick={onCommitClick}
							onCommitDoubleClick={() => {}}
							onCommitRightClick={() => {}}
							className="w-full"
							selectedCommitHashes={[]}
							isSearchMode={false}
						/>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
