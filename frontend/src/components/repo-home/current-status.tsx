import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GitBranch, GitCommit, FileText, Users } from 'lucide-react';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';

interface CurrentStatusProps {
	repoPath: string;
}

export function CurrentStatus(props: CurrentStatusProps) {
	const { repoPath } = props;
	const { homeState } = useRepoState(repoPath);

	const isLoadingBranch = homeState.currentBranch;
	const isLoadingCommits = homeState.recentCommits.isLoading;
	const commitCount = homeState.recentCommits.value?.length ?? 0;

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-lg">
					<GitCommit className="h-4 w-4" />
					Repository Status
				</CardTitle>
				<CardDescription className="text-sm">Current repository information</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3 pt-0">
				{/* Current branch */}
				<div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
					<div className="flex items-center gap-2">
						<GitBranch className="h-3.5 w-3.5 text-green-500" />
						<span className="font-medium text-sm">Current Branch</span>
					</div>
					{isLoadingBranch ? (
						<Skeleton className="h-5 w-16 rounded-full" />
					) : (
						<Badge variant="outline" className="font-mono text-xs">
							{homeState.currentBranch.value || 'unknown'}
						</Badge>
					)}
				</div>

				{/* Repository stats */}
				<div className="grid grid-cols-2 gap-2">
					<div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
						<div className="flex items-center gap-2">
							<FileText className="h-3.5 w-3.5 text-blue-500" />
							<span className="font-medium text-sm">Recent Commits</span>
						</div>
						{isLoadingCommits ? (
							<Skeleton className="h-4 w-6" />
						) : (
							<span className="text-sm font-mono">{commitCount}</span>
						)}
					</div>

					<div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
						<div className="flex items-center gap-2">
							<GitBranch className="h-3.5 w-3.5 text-purple-500" />
							<span className="font-medium text-sm">Branches</span>
						</div>
						{homeState.recentBranches.isLoading ? (
							<Skeleton className="h-4 w-6" />
						) : (
							<span className="text-sm font-mono">
								{homeState.recentBranches.value?.length || 'N/A'}
							</span>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
