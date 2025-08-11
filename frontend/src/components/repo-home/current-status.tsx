import { CommitHash } from '@/components/commit-hash';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Folder, GitBranch, GitCommit } from 'lucide-react';
import { QuickRepoData } from './types';
import { useSidebarContext } from '@/hooks/state/use-sidebar-context';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { useUnixTime } from '@/hooks/use-unix-time';

interface CurrentStatusProps {
	repoPath: string;
}

export function CurrentStatus(props: CurrentStatusProps) {
	const { repoPath } = props;
	const sidebar = useSidebarContext();
	const repoState = useRepoState(repoPath);

	const latestCommit = repoState.logState.logs?.[0];

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-lg">
					<Folder className="h-4 w-4 text-blue-500" />
					{repoPath}
				</CardTitle>
				<CardDescription className="text-sm">Current repository status</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3 pt-0">
				{/* Current branch */}
				<div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
					<div className="flex items-center gap-2">
						<GitBranch className="h-3.5 w-3.5 text-green-500" />
						<span className="font-medium text-sm">Current Branch</span>
					</div>
					<Badge variant="outline" className="font-mono text-xs">
						{repoState.logState.refs?.[0].name}
					</Badge>
				</div>

				{/* Last commit */}
				{!!latestCommit && (
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm font-medium">
							<GitCommit className="h-3.5 w-3.5" />
							Latest Commit
						</div>
						<div className="p-2.5 bg-muted/50 rounded-lg space-y-1.5">
							<p className="text-sm font-medium leading-tight">{}</p>
							<div className="flex items-center gap-3 text-xs text-muted-foreground">
								<CommitHash
									commitHash={latestCommit.commitHash}
									repoPath=""
									shortHash={true}
									showIcon={false}
									enableCopyHash={true}
								/>
								<span>{latestCommit.username}</span>
								<div className="flex items-center gap-1">
									<Clock className="h-3 w-3" />
									<span>
										{useUnixTime(latestCommit.commitTimeStamp).toLocaleDateString()}
									</span>
								</div>
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
