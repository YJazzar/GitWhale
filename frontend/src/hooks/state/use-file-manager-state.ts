import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import {
	CleanupTerminalSession,
	InitNewTerminalSession,
	OnTerminalSessionWasResized,
} from '../../../wailsjs/go/backend/App';
import { EventsEmit, EventsOff, EventsOn } from '@/../wailsjs/runtime/runtime';
import { backend } from '../../../wailsjs/go/models';
import { atom, useAtom } from 'jotai';
import { useEffect, useCallback } from 'react';

type FileTabManagerSessionKey = string;
type TabKey = string;

export interface TabProps {
	// A uniquely identifiable key for the page
	tabKey: TabKey;

	// Renders the title of the tab, most of the time should just be a string (+ maybe an icon)
	titleRender: () => JSX.Element;

	// The component to render when this tab is active
	component: React.ReactNode;

	// Controls if the "x" button shows up
	preventUserClose?: boolean | undefined;

	// Controls if the file is only temporarily open or not
	isPermanentlyOpen?: boolean;

	// Code hook to run additional logic when the tab is closed
	onTabClose?: () => void;
}

export type FileTabManagerProps = {
	// Session key to isolate tab state per session
	fileTabManageSessionKey: FileTabManagerSessionKey;

	// List of available tabs
	initialTabs: TabProps[];

	// Default tab to open if none specified
	defaultTabKey?: string;
};

const activeTabKeyAtom = atom<Map<FileTabManagerSessionKey, TabKey>>(new Map());
const openTabsAtom = atom<Map<FileTabManagerSessionKey, TabProps[]>>(new Map());

export function useFileManagerStatesCleanup(fileTabManageSessionKeys: FileTabManagerSessionKey[]) {
	const [activeTabMap, setActiveTabMap] = useAtom(activeTabKeyAtom);
	const [openTabsMap, setOpenTabsMap] = useAtom(openTabsAtom);

	const removeActiveTabKey = useCallback(() => {
		setActiveTabMap((prevMap) => {
			const newMap = new Map(prevMap);
			fileTabManageSessionKeys.forEach((key) => newMap.delete(key));
			return newMap;
		});
	}, [fileTabManageSessionKeys, setActiveTabMap]);

	const removeOpenTabs = useCallback(() => {
		setOpenTabsMap((prevMap) => {
			const newMap = new Map(prevMap);
			fileTabManageSessionKeys.forEach((key) => newMap.delete(key));
			return newMap;
		});
	}, [fileTabManageSessionKeys, setOpenTabsMap]);

	return {
		cleanupFileManagerStates: () => {
			removeActiveTabKey();
			removeOpenTabs();
		},
	};
}

export function useFileManagerState(
	fileTabManageSessionKey: FileTabManagerSessionKey,
	initialTabs: TabProps[],
	defaultTabKey?: string
) {
	const [activeTabMap, setActiveTabMap] = useAtom(activeTabKeyAtom);
	const [openTabsMap, setOpenTabsMap] = useAtom(openTabsAtom);

	const activeTabKey = activeTabMap.get(fileTabManageSessionKey);
	const setActiveTabKey = useCallback(
		(tabKey: TabKey | undefined) => {
			setActiveTabMap((prevMap) => {
				const newMap = new Map(prevMap);
				if (tabKey === undefined) {
					newMap.delete(fileTabManageSessionKey);
				} else {
					newMap.set(fileTabManageSessionKey, tabKey);
				}
				return newMap;
			});
		},
		[fileTabManageSessionKey, setActiveTabMap]
	);

	const openTabs = openTabsMap.get(fileTabManageSessionKey) || [];
	const setOpenTabs = useCallback(
		(tabs: TabProps[]) => {
			setOpenTabsMap((prevMap) => {
				const newMap = new Map(prevMap);
				newMap.set(fileTabManageSessionKey, tabs);
				return newMap;
			});
		},
		[fileTabManageSessionKey, setOpenTabsMap]
	);

	const activeTab = openTabs.find((tab) => tab.tabKey === activeTabKey);

	useEffect(() => {
		// Copy all initial tabs into the state
		if (!openTabs.length) {
			setOpenTabs(initialTabs);
		}

		// Figure out a default tab
		if (!activeTabKey) {
			let initialTabKeyToOpen = defaultTabKey;
			if (!initialTabKeyToOpen && initialTabs.length > 0) {
				initialTabKeyToOpen = initialTabs[0].tabKey; // use first tab as default if we have one
			}
			setActiveTabKey(initialTabKeyToOpen);
		}
	}, []);

	return {
		activeTab,
		activeTabKey: {
			get: () => activeTabKey,
			set: setActiveTabKey,
		},
		openTabs: {
			get: () => openTabs,
			set: setOpenTabs,
		},
	};
}
