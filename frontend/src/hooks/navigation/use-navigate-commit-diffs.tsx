import { useSidebarHandlers, SidebarItemProps, SidebarSessionKeyGenerator } from '@/hooks/state/useSidebarHandlers';
import RepoCommitDiffView from '@/pages/repo/RepoCommitDiffView';
import { GitCompareArrows } from 'lucide-react';
import { Logger } from '../../utils/logger';
import { useRepoState } from '../state/repo/use-repo-state';
import { git_operations } from 'wailsjs/go/models';
import { useState } from 'react';
import { useShortHash } from '../git-log/use-short-hash';

export function useNavigateToCommitDiffs(repoPath: string) {
	const sidebar = useSidebarHandlers(SidebarSessionKeyGenerator.repoSidebar(repoPath));
	const { diffState } = useRepoState(repoPath);
	const [isLoadingNewDiff, setIsLoadingNewDiff] = useState(false)

	const navigateToCommitDiff = async (firstCommitHash: string, secondCommitHash: string | undefined) => {
		navigateToCommitDiffWithOptions({
			repoPath: repoPath,
			fromRef: firstCommitHash,
			toRef: secondCommitHash ?? '',
			isSingleCommitDiff: secondCommitHash === '' || secondCommitHash === undefined,
		});
	};

	const navigateToCommitDiffWithOptions = async (options: git_operations.DiffOptions) => {
		setIsLoadingNewDiff(true)
		const pageKey = `commit-${options.fromRef}-${options.toRef}`;

		// Check if this commit is already open in the sidebar
		// If it already exists, just switch to it
		const existingItems = sidebar.dynamicItems ?? [];
		const existingCommit = existingItems.find((item) => item.id === pageKey);
		if (existingCommit) {
			sidebar.setActiveItem(pageKey);
			setIsLoadingNewDiff(false)
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
			setIsLoadingNewDiff(false)
			return;
		}

		const firstCommitHashShort = useShortHash(options.fromRef);
		const secondCommitHashShort = useShortHash(options.toRef);
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
		setIsLoadingNewDiff(false)
	};

	return { navigateToCommitDiffWithOptions, navigateToCommitDiff, isLoadingNewDiff };
}
