import { TabProps, useFileTabsState } from './useFileTabsState';
export type { TabProps } from './useFileTabsState';

type FileTabSessionKey = string;

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
	const closeTab = (tabToClose: TabProps): void => {
		const activeTabKey = state.activeTabKey;

		let prevActiveIndex = state.openTabs.findIndex((file) => file.tabKey === activeTabKey);
		if (tabToClose.tabKey === activeTabKey) {
			prevActiveIndex += 1;
		}

		const newAvailableTabs = state.openTabs.filter((openFile) => {
			if (openFile.preventUserClose) {
				return true; // don't close things the user isn't allowed to close
			}
			if (openFile.tabKey === tabToClose.tabKey) {
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
			tabToClose.onTabClose?.();
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
		setTabPermaOpen,
		getActiveTab,
		getTabProps,

		// Cleanup
		cleanup: state.cleanup,
	};
}
