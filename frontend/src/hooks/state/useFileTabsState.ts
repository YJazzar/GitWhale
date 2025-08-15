import { atom, useAtom } from 'jotai';
import { useEffect } from 'react';
import { useMapPrimitive } from './primitives/use-map-primitive';

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
	initialValues?: {
		initialTabs: TabProps[];
		defaultTabKey?: string;
	}
) {
	const _activeTabKeyPrim = useMapPrimitive(activeTabKeyAtom, sessionKey);
	const _openTabsPrim = useMapPrimitive(openTabsAtom, sessionKey);

	// Get current session state
	const activeTabKey = _activeTabKeyPrim.value;
	const openTabs = _openTabsPrim.value || [];

	// Direct setters
	const setActiveTabKey = (tabKey: TabKey | undefined) => {
		if (tabKey === undefined) {
			_activeTabKeyPrim.kill();
		} else {
			_activeTabKeyPrim.set(tabKey);
		}
	};

	// Initialize state on mount
	useEffect(() => {
		if (!initialValues) {
			// We're getting called from a place where we shouldn't initialize the variables yet
			return;
		}

		const initialTabs = initialValues.initialTabs;
		const defaultTabKey = initialValues.defaultTabKey;

		// Copy all initial tabs into the state if empty
		if (!openTabs.length && initialTabs.length > 0) {
			_openTabsPrim.set(initialTabs);
		}

		// Figure out a default tab
		if (!activeTabKey) {
			let initialTabKeyToOpen = defaultTabKey;
			if (!initialTabKeyToOpen && initialTabs.length > 0) {
				initialTabKeyToOpen = initialTabs[0].tabKey;
			}
			if (initialTabKeyToOpen) {
				_activeTabKeyPrim.set(initialTabKeyToOpen);
			}
		}
	}, [sessionKey, initialValues, activeTabKey, openTabs.length]);

	// Computed values
	const activeTab = openTabs.find((tab) => tab.tabKey === activeTabKey);

	return {
		// Direct state access
		activeTabKey,
		activeTab,
		openTabs,

		// Direct setters
		setActiveTabKey,
		setOpenTabs:(newValue: TabProps[]) => {
			 _openTabsPrim.set(newValue)
		},

		// Cleanup function
		cleanup: () => {
			_activeTabKeyPrim.kill();
			_openTabsPrim.kill();
		},
	};
}
