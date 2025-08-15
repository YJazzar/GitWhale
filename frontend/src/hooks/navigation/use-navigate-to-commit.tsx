import { GitCommit, GitMerge } from 'lucide-react';
import { backend } from 'wailsjs/go/models';
import { CommitPreview } from '@/components/commit-preview/commit-preview';
import { useSidebarHandlers, SidebarItemProps } from '@/hooks/state/useSidebarHandlers';
import { Logger } from '../../utils/logger';
import { useShortHash } from '../git-log/use-short-hash';

export function useNavigateToCommit(repoPath: string) {
	const sidebar = useSidebarHandlers(`repo-${repoPath}`, []);

	const handleViewFullCommit = (commitHash: string, isMergeCommit?: boolean) => {
		// Check if this commit is already open in the sidebar
		const existingItems = sidebar.getAllItems();
		const existingCommit = existingItems.find((item) => item.id === `commit-${commitHash}`);

		if (existingCommit) {
			// If it already exists, just switch to it
			sidebar.setActiveItem(`commit-${commitHash}`);
			return;
		}

		// Create the sidebar item
		const commitItem: SidebarItemProps = {
			id: `commit-${commitHash}`,
			title: useShortHash(commitHash) || 'noCommitFound',
			icon: isMergeCommit ? <GitMerge className="h-4 w-4" /> : <GitCommit className="h-4 w-4" />,
			component: <CommitPreview commitHash={commitHash} repoPath={repoPath} />,
			isDynamic: true,
			onClose: () => {
				Logger.debug(`Closing commit view for ${commitHash}`, 'use-navigate-to-commit');
			},
		};

		// Add the item to the sidebar and set it as active
		sidebar.addDynamicItem(commitItem);
	};

	return handleViewFullCommit;
}
