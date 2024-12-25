import React from 'react';

import { backend } from '../../wailsjs/go/models';
import { GetAppState } from '../../wailsjs/go/backend/App';
import { useQuery } from 'react-query';
import { atom, useAtom } from 'jotai';

const appStateAtom = atom(async (get) => {
	return  await GetAppState();
});

export const UseAppState = () => {
	const [state, _] = useAtom(appStateAtom);

	// const directoryDiffDetails = useQuery({
	// 	queryKey: ['GetAppState'],
	// 	queryFn: async () => {
	// 		console.log('getting new app state');
	// 		return await GetAppState();
	// 	},
	// 	onSuccess(data) {
	// 		if (!data) {
	// 			// why did we get null?
	// 			debugger;
	// 			return;
	// 		}

	// 		state.set(data);
	// 	},
	// });

	return state;
};
