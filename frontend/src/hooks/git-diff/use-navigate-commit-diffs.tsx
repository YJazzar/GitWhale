import { useSidebarContext } from '@/hooks/state/use-sidebar-context';
import { SidebarItemProps } from '@/hooks/state/use-sidebar-state';
import RepoCommitDiffView from '@/pages/repo/RepoCommitDiffView';
import { GitCompareArrows } from 'lucide-react';
import { Logger } from '../../utils/logger';
import { useRepoState } from '../state/repo/use-repo-state';
import { git_operations } from 'wailsjs/go/models';

export function useNavigateToCommitDiffs(repoPath: string) {
	const sidebar = useSidebarContext();
	const { diffState } = useRepoState(repoPath);

	const navigateToCommitDiff = async (firstCommitHash: string, secondCommitHash: string | undefined) => {
		const resolvedSecondRef = !secondCommitHash ? `${firstCommitHash}^` : secondCommitHash;
		navigateToCommitDiffWithOptions({
			repoPath: repoPath,
			fromRef: firstCommitHash,
			toRef: resolvedSecondRef,
			filePathFilters: [],
		});
	};

	const navigateToCommitDiffWithOptions = async (options: git_operations.DiffOptions) => {
		const pageKey = `commit-${options.fromRef}-${options.toRef}`;

		// Check if this commit is already open in the sidebar
		// If it already exists, just switch to it
		const existingItems = sidebar.getAllItems();
		const existingCommit = existingItems.find((item) => item.id === pageKey);
		if (existingCommit) {
			sidebar.setActiveItem(pageKey);
			return;
		}

		const diffSession = await diffState.createSession(options);
		const diffSessionID = diffSession?.sessionId;
		if (!diffSessionID) {
			Logger.error(
				'Failed to start a diff session using the given commits:',
				'useNavigateToCommitDiffs'
			);
			Logger.error(`\t - fromRef: ${options.fromRef}`, 'useNavigateToCommitDiffs');
			Logger.error(`\t - toRef: ${options.toRef}`, 'useNavigateToCommitDiffs');
			return;
		}

		const firstCommitHashShort = options.fromRef.slice(0, 7);
		const secondCommitHashShort = options.toRef.slice(0, 7);
		const pageTitle =
			options.toRef !== `${options.fromRef}^`
				? `${firstCommitHashShort}`
				: `${firstCommitHashShort} ↔ ${secondCommitHashShort}`;

		// Create the sidebar item
		const commitItem: SidebarItemProps = {
			id: pageKey,
			title: pageTitle,
			icon: <GitCompareArrows className="w-4 h-4 mr-1" />,
			component: <RepoCommitDiffView repoPath={repoPath} diffSessionID={diffSessionID} />,
			isDynamic: true,
			onClose: () => {
				Logger.debug(
					`Closing RepoCommitDiffView for session ${diffSessionID}`,
					'useNavigateToCommitDiffs'
				);
			},
		};

		// Add the item to the sidebar and set it as active
		sidebar.addDynamicItem(commitItem);
	};

	return {navigateToCommitDiffWithOptions, navigateToCommitDiff};
}
