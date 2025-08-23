import { backend } from 'wailsjs/go/models';

export const UseIsDirDiffMode = (appState: backend.App | undefined) => {
	if (!appState) {
		return undefined;
	}

	if (appState?.startupState?.directoryDiffArgs) {
		return true;
	}

	return false;
};
