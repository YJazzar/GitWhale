import { createContext, useContext } from 'react';

export type SideBarMenuItem = {
	title: string;
	url: string;
	icon: JSX.Element;
};

export type RepoPageHandler = {
	onAddNewDynamicRoute: (newItem: SideBarMenuItem) => void;
	onCloseDynamicRoute: (oldItem: SideBarMenuItem) => void;
};

export const RepoPageHandlersContext = createContext<RepoPageHandler | undefined>(undefined);

export function useRepoPageHandlers() {
	return useContext(RepoPageHandlersContext);
}
