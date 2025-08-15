import Logger from '@/utils/logger';
import { getDiffState } from './use-git-diff-state';
import { getHomeState } from './use-git-home-state';
import { getLogState } from './use-git-log-state';
import { getTerminalState } from './use-repo-terminal';
import { SidebarSessionKeyGenerator, useSidebarHandlers } from '../useSidebarHandlers';

export const useRepoState = (repoPath: string) => {
	const sidebar = useSidebarHandlers(SidebarSessionKeyGenerator.repoSidebar(repoPath));

	const stateObjects = {
		terminalState: getTerminalState(repoPath),
		homeState: getHomeState(repoPath),
		diffState: getDiffState(repoPath),
		logState: getLogState(repoPath),
	};

	const onCloseRepo = () => {
		Logger.info('Called onClose() for repo: ' + repoPath);
		stateObjects.terminalState.disposeTerminal();
		stateObjects.diffState.disposeSessions();
		stateObjects.logState.disposeLogState();
		stateObjects.homeState.disposeHomeState();
		sidebar.cleanup();
	};

	return {
		...stateObjects,
		onCloseRepo,
	};
};
