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
import { useEffect } from 'react';

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

export function useFileManagerState(
	fileTabManageSessionKey: FileTabManagerSessionKey,
	initialTabs: TabProps[],
	defaultTabKey?: string
) {
	const [activeTabMap, setActiveTabMap] = useAtom(activeTabKeyAtom);
	const [openTabsMap, setOpenTabsMap] = useAtom(openTabsAtom);

	const activeTabKey = activeTabMap.get(fileTabManageSessionKey);
	const setActiveTabKey = (tabKey: TabKey | undefined) => {
		const newMap = new Map(activeTabMap);
		if (tabKey === undefined) {
			newMap.delete(fileTabManageSessionKey);
		} else {
			newMap.set(fileTabManageSessionKey, tabKey);
		}
		setActiveTabMap(newMap);
	};

	const openTabs = openTabsMap.get(fileTabManageSessionKey) || [];
	const setOpenTabs = (tabs: TabProps[]) => {
		const newMap = new Map(openTabsMap);
		newMap.set(fileTabManageSessionKey, tabs);
		setOpenTabsMap(newMap);
	};

	const activeTab = openTabs.find((tab) => tab.tabKey === activeTabKey);

	useEffect(() => {
		// Copy all initial tabs into the state
		if (!openTabs.length && initialTabs.length > 0) {
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

	}, [openTabs, initialTabs, defaultTabKey, activeTabKey, setActiveTabKey, setOpenTabs]);

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
