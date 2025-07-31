import XTermWrapper from '@/components/xterm-wrapper';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';

export default function RepoTerminalView() {
	const { repoPath } = useCurrentRepoParams();

	if (!repoPath) {
		return <>Error: why are we rendering RepoTerminalView when there's no repo provided?</>;
	}

	return (
		<div className="flex flex-col h-full">
			<div className="flex items-center justify-between p-4 border-b">
				<h2 className="text-2xl font-bold">Terminal</h2>
			</div>
			
			<div className="flex-1 min-h-0">
				<XTermWrapper />
			</div>
		</div>
	);
}
