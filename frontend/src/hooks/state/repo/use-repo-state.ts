import { getDiffState } from './use-git-diff-state';
import { getLogState } from './use-git-log-state';
import { getTerminalState } from './use-repo-terminal';


export const useRepoState = (repoPath: string) => {
	const stateObjects = {
		terminalState: getTerminalState(repoPath),
		diffState: getDiffState(repoPath),
		logState: getLogState(repoPath),
	};

	const onCloseRepo = () => {
		stateObjects.terminalState.disposeTerminal();
		stateObjects.diffState.disposeSessions();
		stateObjects.logState.disposeLogState();
	};

	return {
		...stateObjects,
		onCloseRepo,
	};
};
