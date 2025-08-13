import { BranchOverview, WorktreesOverview, CurrentStatus, QuickActions, RecentActivity } from '@/components/repo-home';
import { Button } from '@/components/ui/button';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { useSidebarContext } from '@/hooks/state/use-sidebar-context';
import { RefreshCw } from 'lucide-react';

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

	const isAnyLoading = Object.values(homeState.loadingStates).some(loading => loading);

	const handleRefresh = () => {
		homeState.refreshHomeData();
	};

	return (
		<div className="h-full overflow-y-auto">
			<div className="p-4 space-y-4 max-w-7xl mx-auto">
				{/* Header with Quick Actions and Refresh */}
				<div className="flex items-center justify-between gap-4">
					<div className="flex-1">
						<QuickActions repoPath={repoPath} />
					</div>
					<Button 
						variant="outline" 
						size="sm" 
						onClick={handleRefresh}
						disabled={isAnyLoading}
						className="shrink-0"
					>
						<RefreshCw className={`h-4 w-4 mr-2 ${isAnyLoading ? 'animate-spin' : ''}`} />
						Refresh
					</Button>
				</div>

				{/* Main content grid */}
				<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
					{/* Status and branches */}
					<div className="space-y-4">
						<CurrentStatus repoPath={repoPath} />
						
						{/* Show worktrees first if available, then branches */}
						<WorktreesOverview repoPath={repoPath} />
						<BranchOverview repoPath={repoPath} />
					</div>

					{/* Recent activity - spans remaining columns */}
					<div className="lg:col-span-1 xl:col-span-2">
						<RecentActivity repoPath={repoPath} />
					</div>
				</div>
			</div>
		</div>
	);
}
