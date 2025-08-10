import { DirDiffViewer } from '@/components/dir-diff-viewer';

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
