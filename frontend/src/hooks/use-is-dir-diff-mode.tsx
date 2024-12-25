import { UseAppState } from './use-app-state';

export const UseIsDirDiffMode = () => {
	const appState = UseAppState();

	if (appState.promised) {
		return undefined;
	}

	if (!!appState.startupState.value?.directoryDiff) {
		return true;
	}

	return false;
};
