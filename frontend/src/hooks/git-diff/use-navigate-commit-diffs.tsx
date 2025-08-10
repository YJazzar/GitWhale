import { useSidebarContext } from '@/hooks/state/use-sidebar-context';
import { SidebarItemProps } from '@/hooks/state/use-sidebar-state';
import RepoCommitDiffView from '@/pages/repo/RepoCommitDiffView';
import { GitCompareArrows } from 'lucide-react';
import { Logger } from '../../utils/logger';
import { useRepoState } from '../state/repo/use-repo-state';

export function useNavigateToCommitDiffs(repoPath: string) {
	const sidebar = useSidebarContext();
	const { diffState } = useRepoState(repoPath);

	const handleViewFullCommit = async (firstCommitHash: string, secondCommitHash: string | undefined) => {
		const pageKey = `commit-${firstCommitHash}-${secondCommitHash}`;

		// Check if this commit is already open in the sidebar
		// If it already exists, just switch to it
		const existingItems = sidebar.getAllItems();
		const existingCommit = existingItems.find((item) => item.id === pageKey);
		if (existingCommit) {
			sidebar.setActiveItem(pageKey);
			return;
		}

		const resolvedSecondRef = !secondCommitHash ? `${firstCommitHash}^` : secondCommitHash;
		const diffSession = await diffState.createSession({
			repoPath: repoPath,
			fromRef: firstCommitHash,
			toRef: resolvedSecondRef,
			filePathFilters: [],
		});

		const diffSessionID = diffSession?.sessionId
		if (!diffSessionID) {
			Logger.error(
				'Failed to start a diff session using the given commits:',
				'useNavigateToCommitDiffs'
			);
			Logger.error(`\t firstCommitHash: ${firstCommitHash}`, 'useNavigateToCommitDiffs');
			Logger.error(`\t secondCommitHash: ${secondCommitHash}`, 'useNavigateToCommitDiffs');
			return
		}

		const firstCommitHashShort = firstCommitHash.slice(0, 7);
		const secondCommitHashShort = secondCommitHash?.slice(0, 7);
		const pageTitle = !secondCommitHash || secondCommitHash === ""
			? `${firstCommitHashShort}`
			: `${firstCommitHashShort} ↔ ${secondCommitHashShort}`;

		// Create the sidebar item
		const commitItem: SidebarItemProps = {
			id: pageKey,
			title: pageTitle,
			icon: <GitCompareArrows className="w-4 h-4 mr-1" />,
			component: (
				<RepoCommitDiffView repoPath={repoPath} diffSessionID={diffSessionID} />
			),
			isDynamic: true,
			onClose: () => {
				Logger.debug(`Closing RepoCommitDiffView for session ${diffSessionID}`, 'useNavigateToCommitDiffs');
			},
		};

		// Add the item to the sidebar and set it as active
		sidebar.addDynamicItem(commitItem);
	};

	return handleViewFullCommit;
}
