import XTermWrapper from '@/components/xterm-wrapper';

export default function RepoTerminalView({ repoPath }: { repoPath: string }) {
	if (!repoPath) {
		return <>Error: why are we rendering RepoTerminalView when there's no repo provided?</>;
	}

	return (
		<div className="flex flex-col h-full">
			<XTermWrapper repoPath={repoPath} />
		</div>
	);
}
