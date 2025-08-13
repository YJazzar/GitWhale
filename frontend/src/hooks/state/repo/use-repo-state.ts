import { getDiffState } from './use-git-diff-state';
import { getLogState } from './use-git-log-state';
import { getHomeState } from './use-git-home-state';
import { getTerminalState } from './use-repo-terminal';


export const useRepoState = (repoPath: string) => {
	const stateObjects = {
		terminalState: getTerminalState(repoPath),
		homeState: getHomeState(repoPath),
		diffState: getDiffState(repoPath),
		logState: getLogState(repoPath),
	};

	const onCloseRepo = () => {
		stateObjects.terminalState.disposeTerminal();
		stateObjects.diffState.disposeSessions();
		stateObjects.logState.disposeLogState();
		stateObjects.homeState.disposeHomeState();
	};

	return {
		...stateObjects,
		onCloseRepo,
	};
};
