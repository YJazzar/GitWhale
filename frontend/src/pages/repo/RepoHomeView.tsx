import { BranchOverview, CurrentStatus, QuickActions, RecentActivity, useQuickRepoData } from '@/components/repo-home';

interface RepoHomeViewProps {
	repoPath: string;
}

export default function RepoHomeView({ repoPath }: RepoHomeViewProps) {
	const quickData = useQuickRepoData(repoPath);

	if (!repoPath) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Error: No repository path provided</p>
			</div>
		);
	}

	return (
		<div className="h-full overflow-y-auto">
			<div className="p-4 space-y-4 max-w-7xl mx-auto">
			{/* Quick Actions at the top */}
			<QuickActions repoPath={repoPath} />

			{/* Main content grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
				{/* Status and branches */}
				<div className="space-y-4">
					<CurrentStatus data={quickData} />
					<BranchOverview branches={quickData.branches} />
				</div>
				
				{/* Recent activity - spans remaining columns */}
				<div className="lg:col-span-1 xl:col-span-2">
					<RecentActivity commits={quickData.recentCommits} repoPath={repoPath} />
				</div>
			</div>
		</div>
		</div>
	);
}
