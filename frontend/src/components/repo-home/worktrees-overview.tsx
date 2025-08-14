import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderTree } from 'lucide-react';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';

interface WorktreesOverviewProps {
	repoPath: string;
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

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-lg">
					<FolderTree className="h-4 w-4" />
					Worktrees
				</CardTitle>
				<CardDescription className="text-sm">Available worktree repositories</CardDescription>
			</CardHeader>
			<CardContent className="pt-0">
				{isLoading ? (
					<>
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

						<Separator className="my-3" />

						<Button variant="ghost" className="w-full" size="sm" disabled>
							<FolderTree className="h-3.5 w-3.5 mr-2" />
							Manage Worktrees
						</Button>
					</>
				) : (
					<>
						<div className="space-y-1.5">
							{worktrees.map((worktree, index) => (
								<div
									key={index}
									className="flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50"
									onClick={() => {
										// TODO: Open worktree in new window/tab
										console.log('Open worktree:', worktree.path);
									}}
								>
									<div className="flex items-center gap-2">
										<FolderTree className="h-3.5 w-3.5 text-muted-foreground" />
										<div className="flex flex-col">
											<span className="text-sm font-medium font-mono">
												{worktree.branch || 'detached'}
											</span>
											<span className="text-xs text-muted-foreground truncate max-w-[200px]">
												{worktree.path}
											</span>
										</div>
										{worktree.path === repoPath && (
											<Badge variant="secondary" className="text-xs px-1.5 py-0">
												current
											</Badge>
										)}
									</div>
								</div>
							))}
						</div>

						<Separator className="my-3" />

						<Button variant="ghost" className="w-full" size="sm">
							<FolderTree className="h-3.5 w-3.5 mr-2" />
							Manage Worktrees
						</Button>
					</>
				)}
			</CardContent>
		</Card>
	);
}
