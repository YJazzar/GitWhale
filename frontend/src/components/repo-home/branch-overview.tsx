import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { GitBranch } from 'lucide-react';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';

interface BranchOverviewProps {
	repoPath: string;
}

export function BranchOverview(props: BranchOverviewProps) {
	const { repoPath } = props;
	const { homeState } = useRepoState(repoPath);

	const isLoading = homeState.recentBranches.isLoading;
	const recentBranches = homeState.recentBranches.value ?? [];

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-lg">
					<GitBranch className="h-4 w-4" />
					Recent Branches
				</CardTitle>
				<CardDescription className="text-sm">Recent branch activity</CardDescription>
			</CardHeader>
			<CardContent className="pt-0">
				{isLoading ? (
					<>
						<div className="space-y-1.5">
							{Array.from({ length: 4 }).map((_, index) => (
								<div key={index} className="flex items-center justify-between p-2 rounded-lg">
									<div className="flex items-center gap-2">
										<GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
										<Skeleton className="h-4 w-20" />
										{index === 0 && <Skeleton className="h-4 w-12 rounded-full" />}
									</div>
								</div>
							))}
						</div>

						<Separator className="my-3" />

						<Button variant="ghost" className="w-full" size="sm" disabled>
							<GitBranch className="h-3.5 w-3.5 mr-2" />
							Manage Branches
						</Button>
					</>
				) : (
					<>
						<div className="space-y-1.5">
							{recentBranches.map((branch, index) => (
								<div
									key={index}
									className="flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50"
								>
									<div className="flex items-center gap-2">
										<GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
										<span className="text-sm font-medium font-mono">{branch.name}</span>
										{branch.name === homeState.currentBranch.value && (
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
							<GitBranch className="h-3.5 w-3.5 mr-2" />
							Manage Branches
						</Button>
					</>
				)}
			</CardContent>
		</Card>
	);
}
