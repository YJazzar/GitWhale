import { atom, useAtom } from 'jotai';
import { useEffect } from 'react';

type FileTabSessionKey = string;
type TabKey = string;

export interface TabProps {
	tabKey: TabKey;
	titleRender: () => JSX.Element;
	component: React.ReactNode;
	preventUserClose?: boolean;
	isPermanentlyOpen?: boolean;
	onTabClose?: () => void;
}

// Global atoms for session-based state
const activeTabKeyAtom = atom<Map<FileTabSessionKey, TabKey>>(new Map());
const openTabsAtom = atom<Map<FileTabSessionKey, TabProps[]>>(new Map());

export function useFileTabsState(
	sessionKey: FileTabSessionKey,
	initialTabs: TabProps[],
	defaultTabKey?: string
) {
	const [activeTabKeyMap, setActiveTabKeyMap] = useAtom(activeTabKeyAtom);
	const [openTabsMap, setOpenTabsMap] = useAtom(openTabsAtom);

	// Get current session state
	const activeTabKey = activeTabKeyMap.get(sessionKey);
	const openTabs = openTabsMap.get(sessionKey) || [];

	// Direct setters
	const setActiveTabKey = (tabKey: TabKey | undefined) => {
		setActiveTabKeyMap(prev => {
			const newMap = new Map(prev);
			if (tabKey === undefined) {
				newMap.delete(sessionKey);
			} else {
				newMap.set(sessionKey, tabKey);
			}
			return newMap;
		});
	};

	const setOpenTabs = (tabs: TabProps[]) => {
		setOpenTabsMap(prev => {
			const newMap = new Map(prev);
			newMap.set(sessionKey, tabs);
			return newMap;
		});
	};

	// Initialize state on mount
	useEffect(() => {
		// Copy all initial tabs into the state if empty
		if (!openTabs.length && initialTabs.length > 0) {
			setOpenTabs(initialTabs);
		}

		// Figure out a default tab
		if (!activeTabKey) {
			let initialTabKeyToOpen = defaultTabKey;
			if (!initialTabKeyToOpen && initialTabs.length > 0) {
				initialTabKeyToOpen = initialTabs[0].tabKey;
			}
			if (initialTabKeyToOpen) {
				setActiveTabKey(initialTabKeyToOpen);
			}
		}
	}, [sessionKey, initialTabs, defaultTabKey, activeTabKey, openTabs.length]);

	// Computed values
	const activeTab = openTabs.find(tab => tab.tabKey === activeTabKey);

	return {
		// Direct state access
		activeTabKey,
		activeTab,
		openTabs,
		
		// Direct setters
		setActiveTabKey,
		setOpenTabs,
		
		// Cleanup function
		cleanup: () => {
			setActiveTabKeyMap(prev => {
				const newMap = new Map(prev);
				newMap.delete(sessionKey);
				return newMap;
			});
			setOpenTabsMap(prev => {
				const newMap = new Map(prev);
				newMap.delete(sessionKey);
				return newMap;
			});
		}
	};
}