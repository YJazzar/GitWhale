import React from 'react';
import { hookstate, useHookstate } from '@hookstate/core';
import { backend } from '../../wailsjs/go/models';
import { GetAppState } from '../../wailsjs/go/backend/App';

const appState = hookstate<backend.App>(GetAppState);


export const UseAppState = () => {
	const state = useHookstate(appState);
	return state;
};
