import { useEffect } from 'react';
import { useAppState } from '@/store/hooks';
import { backend } from '../../wailsjs/go/models';

export const UseAppState = () => {
	const { appState, refreshAppState } = useAppState();

	useEffect(() => {
		if (!!appState) {
			return;
		}

		refreshAppState();
	}, [appState, refreshAppState]);

	// Helper function, idk if it's that helpful
	const executeAndRefreshState = async (func: () => Promise<backend.App>) => {
		let newState = await func();
		// Note: This function signature doesn't match the new useAppState hook
		// If needed, this should be refactored to use the new patterns
		return newState;
	};

	return { appState, refreshAppState, executeAndRefreshState };
};
