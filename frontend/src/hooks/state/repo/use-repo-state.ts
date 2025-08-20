import Logger from '@/utils/logger';
import { getDiffState } from './use-git-diff-state';
import { getHomeState } from './use-git-home-state';
import { getLogState } from './use-git-log-state';
import { getTerminalState } from './use-repo-terminal';
import { getStagingState } from './use-git-staging-state';
import { SidebarSessionKeyGenerator, useSidebarHandlers } from '../useSidebarHandlers';

export const useRepoState = (repoPath: string) => {
	const sidebar = useSidebarHandlers(SidebarSessionKeyGenerator.repoSidebar(repoPath));

	const stateObjects = {
		terminalState: getTerminalState(repoPath),
		homeState: getHomeState(repoPath),
		diffState: getDiffState(repoPath),
		logState: getLogState(repoPath),
		stagingState: getStagingState(repoPath),
	};

	const onCloseRepo = () => {
		Logger.info('Called onClose() for repo: ' + repoPath);
		stateObjects.terminalState.disposeTerminal();
		stateObjects.diffState.disposeSessions();
		stateObjects.logState.disposeLogState();
		stateObjects.homeState.disposeHomeState();
		stateObjects.stagingState.disposeStagingState();
		sidebar.cleanup();
	};

	return {
		...stateObjects,
		onCloseRepo,
	};
};
