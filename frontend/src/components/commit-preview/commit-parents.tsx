import { Separator } from '@/components/ui/separator';
import { CommitHash } from '../commit-hash';
import { git_operations } from 'wailsjs/go/models';

interface CommitParentsProps {
	commit: git_operations.DetailedCommitInfo;
	repoPath: string;
}

export function CommitParents({ commit, repoPath }: CommitParentsProps) {
	if (!commit.parentCommitHashes || commit.parentCommitHashes.length === 0) return null;

	return (
		<>
			<Separator />
			<div className="space-y-2">
				<h4 className="text-sm font-medium text-muted-foreground">
					Parent Commits ({commit.parentCommitHashes.length})
				</h4>
				<div className="flex flex-wrap gap-2">
					{commit.parentCommitHashes.map((parentHash, index) => (
						<CommitHash
							key={index}
							commitHash={parentHash}
							shortHash={true}
							showIcon={false}
							className="shrink-0"
							repoPath={repoPath}
							enableCopyHash
						/>
					))}
				</div>
			</div>
		</>
	);
}