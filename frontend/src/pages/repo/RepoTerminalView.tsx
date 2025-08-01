import XTermWrapper from '@/components/xterm-wrapper';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';

export default function RepoTerminalView() {
	const { repoPath } = useCurrentRepoParams();

	if (!repoPath) {
		return <>Error: why are we rendering RepoTerminalView when there's no repo provided?</>;
	}

	return (
		<div className="flex flex-col h-full">
			<XTermWrapper />
		</div>
	);
}
