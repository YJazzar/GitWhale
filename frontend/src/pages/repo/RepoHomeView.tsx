import { QuickActions } from '@/components/repo-home/quick-actions';
import { RecentCommits } from '@/components/repo-home/recent-commits';
import { WorktreesOverview } from '@/components/repo-home/worktrees-overview';
import { useRepoHomeState } from '@/hooks/state/repo/use-git-home-state';

interface RepoHomeViewProps {
	repoPath: string;
}

export default function RepoHomeView({ repoPath }: RepoHomeViewProps) {
	const { refreshHomeData, isAnyLoading } = useRepoHomeState(repoPath, true);

	if (!repoPath) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Error: No repository path provided</p>
			</div>
		);
	}

	const handleRefresh = () => {
		refreshHomeData();
	};

	return (
		<div className="h-full flex flex-col">
			<div className="shrink-0 p-4 max-w-7xl mx-auto w-full">
				{/* Header with Quick Actions */}
				<QuickActions repoPath={repoPath} onRefresh={handleRefresh} isRefreshing={isAnyLoading} />
			</div>

			{/* Main content grid - takes remaining height */}
			<div className="flex-1 min-h-0 px-4 pb-4 max-w-7xl mx-auto w-full">
				<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 h-full">
					{/* Show worktrees first if available, then branches */}
					<div className="h-full overflow-auto">
						<WorktreesOverview repoPath={repoPath} />
					</div>

					{/* Recent activity - spans remaining columns */}
					<div className="lg:col-span-1 xl:col-span-2 h-full overflow-auto">
						<RecentCommits repoPath={repoPath} />
					</div>
				</div>
			</div>
		</div>
	);
}
