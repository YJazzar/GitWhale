import { GitRefs } from '../git-refs';
import { git_operations } from 'wailsjs/go/models';

interface CommitRefsProps {
	commit: git_operations.DetailedCommitInfo;
}

export function CommitRefs({ commit }: CommitRefsProps) {
	if (!commit.refs || commit.refs.trim() === '') return null;

	return (
		<div className="space-y-2">
			<h4 className="text-sm font-medium text-muted-foreground">Branches & Tags</h4>
			<GitRefs refs={commit.refs} size="sm" showHead={true} />
		</div>
	);
}