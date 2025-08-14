import { createContext, useContext, ReactNode } from 'react';
import { SidebarHandle } from '@/components/sidebar';
import { SidebarItemProps } from '@/hooks/state/use-sidebar-state';

interface SidebarContextType {
	addDynamicItem: (item: SidebarItemProps) => void;
	removeDynamicItem: (itemId: string) => void;
	setActiveItem: (itemId: string) => void;
	toggleMode: () => void;
	getActiveItem: () => SidebarItemProps | undefined;
	getAllItems: () => SidebarItemProps[];
}

const SidebarContext = createContext<SidebarContextType | null>(null);

interface SidebarContextProviderProps {
	children: ReactNode;
	sidebarRef: React.RefObject<SidebarHandle>;
}

export function SidebarContextProvider({ children, sidebarRef }: SidebarContextProviderProps) {
	const contextValue: SidebarContextType = {
		addDynamicItem: (item: SidebarItemProps) => {
			sidebarRef.current?.addDynamicItem(item);
		},
		removeDynamicItem: (itemId: string) => {
			sidebarRef.current?.removeDynamicItem(itemId);
		},
		setActiveItem: (itemId: string) => {
			sidebarRef.current?.setActiveItem(itemId);
		},
		toggleMode: () => {
			sidebarRef.current?.toggleMode();
		},
		getActiveItem: () => {
			return sidebarRef.current?.getActiveItem();
		},
		getAllItems: () => {
			return sidebarRef.current?.getAllItems() || [];
		},
	};

	return <SidebarContext.Provider value={contextValue}>{children}</SidebarContext.Provider>;
}

export function useSidebarContext(): SidebarContextType {
	const context = useContext(SidebarContext);
	if (!context) {
		throw new Error('useSidebarContext must be used within a SidebarContextProvider');
	}
	return context;
}
