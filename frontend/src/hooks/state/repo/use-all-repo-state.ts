import Logger from '@/utils/logger';
import { useRepoDiffState } from './use-git-diff-state';
import { useRepoHomeState } from './use-git-home-state';
import { useRepoLogState } from './use-git-log-state';
import { useRepoTerminalState } from './use-repo-terminal';
import { useGitStagingState } from './use-git-staging-state';
import { SidebarSessionKeyGenerator, useSidebarHandlers } from '../useSidebarHandlers';
import { useCallback, useMemo } from 'react';

export const useAllRepoStates = (repoPath: string) => {
	const sidebar = useSidebarHandlers(SidebarSessionKeyGenerator.repoSidebar(repoPath));

	const terminalState = useRepoTerminalState(repoPath);
	const homeState = useRepoHomeState(repoPath, false);
	const diffState = useRepoDiffState(repoPath);
	const logState = useRepoLogState(repoPath);
	const stagingState = useGitStagingState(repoPath);

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
