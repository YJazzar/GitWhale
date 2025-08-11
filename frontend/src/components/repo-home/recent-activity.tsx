import { CommitHash } from '@/components/commit-hash';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
	ArrowRight,
	Calendar,
	GitCommit,
	GitMerge,
	History,
} from 'lucide-react';
import { QuickRepoData } from './types';

interface RecentActivityProps {
	commits: QuickRepoData['recentCommits'];
	repoPath: string;
}

export function RecentActivity({ commits, repoPath }: RecentActivityProps) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-lg">
					<History className="h-4 w-4" />
					Recent Activity
				</CardTitle>
				<CardDescription className="text-sm">Latest commits in this repository</CardDescription>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="space-y-2">
					{commits.map((commit, index) => (
						<div 
							key={index} 
							className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
						>
							{commit.isMerge ? (
								<GitMerge className="h-3.5 w-3.5 mt-0.5 text-purple-500 flex-shrink-0" />
							) : (
								<GitCommit className="h-3.5 w-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
							)}
							<div className="flex-1 min-w-0 space-y-1">
								<p className="text-sm font-medium leading-tight truncate group-hover:text-primary">
									{commit.message}
								</p>
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<CommitHash 
										commitHash={commit.hash}
										repoPath={repoPath}
										shortHash={true}
										showIcon={false}
										enableCopyHash={true}
									/>
									<span>•</span>
									<span>{commit.author}</span>
									<span>•</span>
									<Calendar className="h-3 w-3" />
									<span>{commit.date.toLocaleDateString()}</span>
								</div>
							</div>
							<ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
						</div>
					))}
				</div>

				<Separator className="my-3" />
				
				<Button variant="ghost" className="w-full" size="sm">
					<History className="h-3.5 w-3.5 mr-2" />
					View Full History
				</Button>
			</CardContent>
		</Card>
	);
}