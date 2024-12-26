import { atom, useAtom } from 'jotai';
import { GetAppState } from '../../wailsjs/go/backend/App';
import { backend } from '../../wailsjs/go/models';
import { useEffect } from 'react';

const appStateAtom = atom<backend.App | undefined>(undefined);

export const UseAppState = () => {
	const [state, setState] = useAtom(appStateAtom);

	const initAppState = async () => {
		if (!!state) {
			return;
		}
		const initialAppState = await GetAppState();
		setState(initialAppState);
	};

	useEffect(() => {
		if (!!state) {
			return;
		}

		initAppState();
	}, [state, setState]);

	const executeAndRefreshState = async (func: () => Promise<backend.App>) => {
		let newState = await func();
		setState(newState);
	};

	return { appState: state, executeAndRefreshState };
};
