import { backend } from 'wailsjs/go/models';

interface D3GitGraphProps {
	commits: backend.GitLogCommitInfo[];
	onCommitClick?: (commitHash: string) => void;
	className?: string;
}

export function D3GitGraph({ commits, onCommitClick, className }: D3GitGraphProps) {

	// Render commit details alongside the graph
	return (
		<div className={className}>
			
		</div>
	);
}