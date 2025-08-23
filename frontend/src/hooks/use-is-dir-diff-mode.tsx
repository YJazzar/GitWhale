import { UseAppState } from './state/use-app-state';

export const UseIsDirDiffMode = () => {
	const {appState} = UseAppState();

	if (!appState) {
		return undefined;
	}

	if (appState?.startupState?.directoryDiffArgs) {
		return true;
	}

	return false;
};
