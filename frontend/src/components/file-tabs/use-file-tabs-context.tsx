import { createContext, useContext, ReactNode } from 'react';
import { TabsManagerHandle } from './file-tabs';
import { TabProps } from '@/hooks/state/use-file-manager-state';

interface FileTabsContextType {
	closeTab: (tabToClose: TabProps) => void;
	openTab: (tabToOpen: TabProps) => void;
	getActiveTab: () => TabProps | undefined;
	getTabProps: (tabKey: string) => TabProps | undefined;
	setTabPermaOpen: (tab: TabProps) => void;
}

const FileTabsContext = createContext<FileTabsContextType | null>(null);

interface FileTabsContextProviderProps {
	children: ReactNode;
	fileTabsRef: React.RefObject<TabsManagerHandle>;
}

export function FileTabsContextProvider({ children, fileTabsRef }: FileTabsContextProviderProps) {
	const contextValue: FileTabsContextType = {
		closeTab: (tabToClose: TabProps) => {
			fileTabsRef.current?.closeTab(tabToClose);
		},
		openTab: (tabToOpen: TabProps) => {
			fileTabsRef.current?.openTab(tabToOpen);
		},
		getActiveTab: () => {
			return fileTabsRef.current?.getActiveTab();
		},
		getTabProps: (tabKey: string) => {
			return fileTabsRef.current?.getTabProps(tabKey);
		},
		setTabPermaOpen: (tab: TabProps) => {
			fileTabsRef.current?.setTabPermaOpen(tab);
		},
	};

	return <FileTabsContext.Provider value={contextValue}>{children}</FileTabsContext.Provider>;
}

export function useFileTabsContext(): FileTabsContextType {
	const context = useContext(FileTabsContext);
	if (!context) {
		throw new Error('useFileTabsContext must be used within a FileTabsContextProvider');
	}
	return context;
}
