import { TabProps, useFileTabsState } from './useFileTabsState';
export type { TabProps } from './useFileTabsState';

type FileTabSessionKey = string;

export const FileTabsSessionKeyGenerator = {
	appWorkspace: () => {
		return `app-workspace`;
	},
	startupDiffViewer: () => {
		return 'startup-diff-viewer';
	},
	diffSession: (diffSessionID: string) => {
		return `diff-session-${diffSessionID}`;
	},
	stagingArea: (repoPath: string) => {
		return `staging-area-${repoPath}`;
	},
};

export function useFileTabsHandlers(
	sessionKey: FileTabSessionKey,
	initialValues?: {
		initialTabs: TabProps[];
		defaultTabKey?: string;
	}
) {
	const state = useFileTabsState(sessionKey, initialValues);

	/**
	 * Close the specified tab
	 */
	const closeTab = (tabKeyToClose: string): void => {
		const activeTabKey = state.activeTabKey;

		let prevActiveIndex = state.openTabs.findIndex((file) => file.tabKey === activeTabKey);
		if (prevActiveIndex === -1) {
			return;
		}

		const tabPropsToClose = state.openTabs[prevActiveIndex];
		if (tabKeyToClose === activeTabKey) {
			prevActiveIndex += 1;
		}

		const newAvailableTabs = state.openTabs.filter((openFile) => {
			if (openFile.preventUserClose) {
				return true; // don't close things the user isn't allowed to close
			}
			if (openFile.tabKey === tabKeyToClose) {
				return false; // close the tab
			}
			return true;
		});

		// Update state
		prevActiveIndex %= newAvailableTabs.length;
		if (prevActiveIndex < newAvailableTabs.length) {
			state.setActiveTabKey(newAvailableTabs[prevActiveIndex]?.tabKey);
		} else {
			state.setActiveTabKey(undefined);
		}
		state.setOpenTabs([...newAvailableTabs]);

		const actuallyClosingFile = newAvailableTabs.length !== state.openTabs.length;
		if (actuallyClosingFile) {
			tabPropsToClose.onTabClose?.();
		}
	};

	/*
	 * Switches to a tab using just the tab key. Assumes the tab is already open
	 */
	const switchToTab = (newTabKey: string): void => {
		// Make sure the tab exists first, then set it as the active tab
		if (state.openTabs.some((tab) => tab.tabKey === newTabKey)) {
			state.setActiveTabKey(newTabKey);
			return;
		}
	};

	/**
	 * Open a new tab or switch to an existing tab with the same key
	 */
	const openTab = (newTab: TabProps): void => {
		// If the tab is already open in a different tab
		if (state.openTabs.some((tab) => tab.tabKey === newTab.tabKey)) {
			state.setActiveTabKey(newTab.tabKey);
			return;
		}

		// Filter out any non-permanently open files
		const newAvailableTabs = state.openTabs.filter((openFile) => {
			return openFile.isPermanentlyOpen || openFile.preventUserClose;
		});

		state.setOpenTabs([...newAvailableTabs, newTab]);
		state.setActiveTabKey(newTab.tabKey);
	};

	/**
	 * Make a tab permanently open (prevents auto-closing)
	 */
	const setTabPermaOpen = (tabToKeepOpen: TabProps): void => {
		const newAvailableTabs = state.openTabs.map((tab) => {
			if (tab.tabKey === tabToKeepOpen.tabKey) {
				return { ...tab, isPermanentlyOpen: true };
			}
			return tab;
		});
		state.setOpenTabs(newAvailableTabs);
	};

	/**
	 * Get the currently active tab, if any
	 */
	const getActiveTab = (): TabProps | undefined => {
		return state.activeTab;
	};

	/**
	 * Get tab properties by tab key
	 */
	const getTabProps = (tabKey: string): TabProps | undefined => {
		return state.openTabs.find((tab) => tab.tabKey === tabKey);
	};

	return {
		// State (read-only)
		activeTab: state.activeTab,
		activeTabKey: state.activeTabKey,
		openTabs: state.openTabs,

		// Actions
		closeTab,
		openTab,
		switchToTab,
		setTabPermaOpen,
		getActiveTab,
		getTabProps,

		// Cleanup
		cleanup: state.cleanup,
	};
}
