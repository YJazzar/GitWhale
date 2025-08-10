import { DirDiffViewer } from '@/components/dir-diff-viewer';
import { EmptyState } from '@/components/empty-state';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { GitCompare, X } from 'lucide-react';

interface RepoCommitDiffViewProps {
	repoPath: string;
	diffSessionID: string;
}

export default function RepoCommitDiffView({ repoPath, diffSessionID }: RepoCommitDiffViewProps) {

	return (
		<div className="flex flex-col h-full">
			<DirDiffViewer repoPath={repoPath} diffSessionID={diffSessionID} />
		</div>
	);
}
