import { QuickActions } from '@/components/repo-home/quick-actions';
import { RecentActivity } from '@/components/repo-home/recent-activity';
import { WorktreesOverview } from '@/components/repo-home/worktrees-overview';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';

interface RepoHomeViewProps {
	repoPath: string;
}

export default function RepoHomeView({ repoPath }: RepoHomeViewProps) {
	const { homeState } = useRepoState(repoPath);

	if (!repoPath) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Error: No repository path provided</p>
			</div>
		);
	}

	const isAnyLoading = homeState.isAnyLoading;

	const handleRefresh = () => {
		homeState.refreshHomeData();
	};

	return (
		<div className="h-full overflow-y-auto">
			<div className="p-4 space-y-4 max-w-7xl mx-auto h-full flex flex-col">
				{/* Header with Quick Actions */}
				<div className="flex-shrink">
					<QuickActions repoPath={repoPath} onRefresh={handleRefresh} isRefreshing={isAnyLoading} />
				</div>

				{/* Main content grid */}
				<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 flex-grow">
					{/* Show worktrees first if available, then branches */}
					<WorktreesOverview repoPath={repoPath} />

					{/* Recent activity - spans remaining columns */}
					<div className="lg:col-span-1 xl:col-span-2">
						<RecentActivity repoPath={repoPath} />
					</div>
				</div>
			</div>
		</div>
	);
}
