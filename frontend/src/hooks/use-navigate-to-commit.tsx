import { GitCommit, GitMerge } from 'lucide-react';
import { backend } from 'wailsjs/go/models';
import { CommitDetails } from '@/components/commit-details';
import { useSidebarContext } from '@/hooks/state/use-sidebar-context';
import { SidebarItemProps } from '@/hooks/state/use-sidebar-state';

export function useNavigateToCommit(commitHash: string, repoPath: string, isMergeCommit?: boolean): () => void {
	const sidebar = useSidebarContext();

	const handleViewFullCommit = () => {
		// Check if this commit is already open in the sidebar
		const existingItems = sidebar.getAllItems();
		const existingCommit = existingItems.find(item => item.id === `commit-${commitHash}`);
		
		if (existingCommit) {
			// If it already exists, just switch to it
			sidebar.setActiveItem(`commit-${commitHash}`);
			return;
		}

		// Create the sidebar item
		const commitItem: SidebarItemProps = {
			id: `commit-${commitHash}`,
			title: commitHash.slice(0, 7),
			icon: isMergeCommit ? <GitMerge className="h-4 w-4" /> : <GitCommit className="h-4 w-4" />,
			component: <CommitDetails commitHash={commitHash} repoPath={repoPath} hideViewFullButton={true} />,
			isDynamic: true,
			onClose: () => {
				console.log(`Closing commit view for ${commitHash}`);
			},
		};

		// Add the item to the sidebar and set it as active
		sidebar.addDynamicItem(commitItem);
	};

	return handleViewFullCommit;
}
