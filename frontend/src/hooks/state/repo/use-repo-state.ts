import Logger from '@/utils/logger';
import { getDiffState } from './use-git-diff-state';
import { getHomeState } from './use-git-home-state';
import { getLogState } from './use-git-log-state';
import { getTerminalState } from './use-repo-terminal';
import { getStagingState } from './use-git-staging-state';
import { SidebarSessionKeyGenerator, useSidebarHandlers } from '../useSidebarHandlers';
import { useCallback, useMemo } from 'react';

export const useRepoState = (repoPath: string) => {
	const sidebar = useSidebarHandlers(SidebarSessionKeyGenerator.repoSidebar(repoPath));

	const terminalState = getTerminalState(repoPath);
	const homeState = getHomeState(repoPath);
	const diffState = getDiffState(repoPath);
	const logState = getLogState(repoPath);
	const stagingState = getStagingState(repoPath);

	const stateObjects = useMemo(() => {
		return {
			terminalState,
			homeState,
			diffState,
			logState,
			stagingState,
		};
	}, [terminalState, homeState, diffState, logState, stagingState]);

	const onCloseRepo = useCallback(() => {
		Logger.info('Called onClose() for repo: ' + repoPath);
		stateObjects.terminalState.disposeTerminal();
		stateObjects.diffState.disposeSessions();
		stateObjects.logState.disposeLogState();
		stateObjects.homeState.disposeHomeState();
		stateObjects.stagingState.disposeStagingState();
		sidebar.cleanup();
	}, [terminalState, stateObjects]);

	return useMemo(() => {
		return {
			...stateObjects,
			onCloseRepo,
		};
	}, [stateObjects, onCloseRepo]);
};
