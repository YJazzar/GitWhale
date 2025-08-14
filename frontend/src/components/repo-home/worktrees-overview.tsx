import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderTree } from 'lucide-react';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { git_operations } from 'wailsjs/go/models';

interface WorktreesOverviewProps {
	repoPath: string;
}

function WorktreesSkeleton() {
	return (
		<div className="space-y-1.5">
			{Array.from({ length: 3 }).map((_, index) => (
				<div key={index} className="flex items-center justify-between p-2 rounded-lg">
					<div className="flex items-center gap-2">
						<FolderTree className="h-3.5 w-3.5 text-muted-foreground" />
						<div className="flex flex-col space-y-1">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-3 w-32" />
						</div>
						{index === 0 && <Skeleton className="h-4 w-12 rounded-full" />}
					</div>
				</div>
			))}
		</div>
	);
}

export function WorktreesOverview(props: WorktreesOverviewProps) {
	const { repoPath } = props;
	const { homeState } = useRepoState(repoPath);

	const isLoading = homeState.worktrees.isLoading;
	const worktrees = homeState.worktrees.value ?? [];
	const hasWorktrees = worktrees.length > 0;

	// Don't render if no worktrees found
	if (!isLoading && !hasWorktrees) {
		return null;
	}

	const onOpenWorktree = (worktree: git_operations.WorktreeInfo) => {

	}

	return (
		<Card className="h-full flex flex-col">
			<CardHeader className="pb-3 flex-shrink-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					<FolderTree className="h-4 w-4" />
					Worktrees
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-0 flex-1 min-h-0 overflow-y-auto">
				<div className="space-y-3">
					<Button variant="ghost" className="w-full" size="sm" disabled={isLoading}>
						<FolderTree className="h-3.5 w-3.5 mr-2" />
						Manage Worktrees
					</Button>

					<Separator />

					{isLoading ? (
						<WorktreesSkeleton />
					) : (
						<div className="space-y-1.5">
							{worktrees
								.filter((worktree) => !!worktree.branch)
								.map((worktree, index) => (
									<div
										key={index}
										className="flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50"
										onClick={() => {
											onOpenWorktree(worktree)
										}}
									>
										<div className="flex items-center gap-2">
											<FolderTree className="h-4 w-4 text-muted-foreground" />
											<div className="flex flex-col">
												<span className="text-sm font-medium font-mono my-1">
													{worktree.branch || worktree.hash}
													{worktree.path === repoPath && (
														<Badge
															variant="secondary"
															className="text-xs px-1.5 mx-2 "
														>
															current
														</Badge>
													)}
												</span>
												<span className="text-xs text-muted-foreground truncate">
													{worktree.path}
												</span>
											</div>
										</div>
									</div>
								))}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
