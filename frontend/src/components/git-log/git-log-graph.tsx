import { D3GitGraph } from '@/components/git-log/d3-git-graph';
import { ContextMenuProvider } from '@/components/ui/context-menu-provider';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { useContextMenu, type ContextMenuAction } from '@/hooks/use-context-menu';
import { cn } from '@/lib/utils';
import { CommitSelectType } from '@/pages/repo/RepoLogView';
import { Cherry, Copy, Eye, GitBranch, RotateCcw, Loader2 } from 'lucide-react';
import { useEffect, useRef, useCallback } from 'react';

interface GitLogGraphProps {
	repoPath: string;
	onCommitClick: (commitHash: string, selectionType: CommitSelectType) => void;
	onCommitDoubleClick: (commitHash: string) => void;
	className?: string;
}

export function GitLogGraph({ repoPath, onCommitClick, onCommitDoubleClick, className }: GitLogGraphProps) {
	const { logState } = useRepoState(repoPath);
	const commits = logState.logs;
	const isLoading = logState.isLoading;
	const isLoadingMore = logState.isLoadingMore;
	const hasMoreCommits = logState.hasMoreCommits;
	const selectedCommitHashes = logState.selectedCommits.currentSelectedCommits;

	useEffect(() => {
		if (!commits?.length) {
			logState.refreshLogAndRefs();
		}
	}, []);

	// Intersection Observer for infinite scrolling (based on the article)
	const observer = useRef<IntersectionObserver>();
	const lastCommitElementRef = useCallback(
		(node: HTMLDivElement | null) => {
			if (isLoadingMore) return;
			if (observer.current) observer.current.disconnect();
			
			observer.current = new IntersectionObserver((entries) => {
				if (entries[0].isIntersecting && hasMoreCommits) {
					logState.loadMoreCommits();
				}
			});
			
			if (node) observer.current.observe(node);
		},
		[isLoadingMore, hasMoreCommits, logState.loadMoreCommits]
	);

	// Check if we're in search mode by looking at the current log options
	const currentLogOptions = logState.options.get();
	const isSearchMode = !!(currentLogOptions.searchQuery && currentLogOptions.searchQuery.trim());

	// Define commit-specific context menu actions
	const commitActions: ContextMenuAction<string>[] = [
		{
			id: 'copy',
			label: 'Copy commit hash',
			icon: Copy,
			onClick: (commitHash) => {
				console.log('Copy commit hash:', commitHash);
				navigator.clipboard?.writeText(commitHash);
			},
		},
		{
			id: 'view-details',
			label: 'View commit details',
			icon: Eye,
			onClick: (commitHash) => {
				console.log('View commit details:', commitHash);
				// TODO: Implement view details functionality
			},
		},
		{
			id: 'separator-1',
			label: '',
			separator: true,
			onClick: () => {},
		},
		{
			id: 'cherry-pick',
			label: 'Cherry-pick commit',
			icon: Cherry,
			onClick: (commitHash) => {
				console.log('Cherry-pick commit:', commitHash);
				// TODO: Implement cherry-pick functionality
			},
		},
		{
			id: 'revert',
			label: 'Revert commit',
			icon: RotateCcw,
			onClick: (commitHash) => {
				console.log('Revert commit:', commitHash);
				// TODO: Implement revert functionality
			},
		},
	];

	// Context menu functionality
	const { contextMenuState, showContextMenu, hideContextMenu } = useContextMenu<string>({
		actions: commitActions,
		shouldShow: (commitHash) => selectedCommitHashes.includes(commitHash) || true,
	});

	if (isLoading) {
		return (
			<div className={cn('flex items-center justify-center h-32', className)}>
				<div className="flex items-center gap-2 text-muted-foreground">
					<GitBranch className="w-4 h-4 animate-pulse" />
					<span>Loading git log...</span>
				</div>
			</div>
		);
	}

	if (!commits || commits.length === 0) {
		return (
			<div
				className={cn(
					'flex flex-col items-center justify-center h-32 text-muted-foreground',
					className
				)}
			>
				<GitBranch className="w-8 h-8 mb-2 opacity-50" />
				<span>No commits to display</span>
			</div>
		);
	}

	const handleRightClick = (event: React.MouseEvent, commitHash: string) => {
		showContextMenu(event, commitHash);
	};

	return (
		<div className={cn('git-log-graph overflow-auto w-full', className)}>
			<D3GitGraph
				commits={commits}
				onCommitClick={onCommitClick}
				onCommitDoubleClick={onCommitDoubleClick}
				onCommitRightClick={handleRightClick}
				className="w-full"
				selectedCommitHashes={selectedCommitHashes}
				isSearchMode={isSearchMode}
				lastCommitElementRef={lastCommitElementRef}
			/>

			{/* Loading more indicator */}
			{isLoadingMore && (
				<div className="flex items-center justify-center p-4 text-muted-foreground">
					<Loader2 className="w-4 h-4 animate-spin mr-2" />
					<span>Loading more commits...</span>
				</div>
			)}

			{/* End of commits indicator */}
			{!hasMoreCommits && commits && commits.length > 0 && (
				<div className="flex items-center justify-center p-4 text-muted-foreground text-sm">
					<span>No more commits to load</span>
				</div>
			)}

			{contextMenuState && (
				<ContextMenuProvider
					isOpen={contextMenuState.isOpen}
					position={contextMenuState.position}
					contextData={contextMenuState.contextData}
					actions={commitActions}
					onClose={hideContextMenu}
				/>
			)}
		</div>
	);
}
