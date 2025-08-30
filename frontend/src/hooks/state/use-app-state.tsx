import { atom, useAtom } from 'jotai';
import { useEffect, useMemo } from 'react';
import { GetAppState } from '../../../wailsjs/go/backend/App';
import { backend } from '../../../wailsjs/go/models';

const appStateAtom = atom<backend.App | undefined>(undefined);

export const UseAppState = () => {
	const [state, setState] = useAtom(appStateAtom);

	const refreshAppState = async () => {
		const newAppState = await GetAppState();
		setState(newAppState);
		return newAppState;
	};

	useEffect(() => {
		if (state) {
			return;
		}

		refreshAppState();
	}, [state, setState]);

	return useMemo(() => {
		return { appState: state, refreshAppState };
	}, [state, refreshAppState]);
};

export function useAppStateAtoms() {
	return {
		appStateAtom,
	};
}
