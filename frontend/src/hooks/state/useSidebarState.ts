import { atom, useAtom } from 'jotai';
import { ReactNode, useEffect } from 'react';

type SidebarSessionKey = string;
type SidebarItemId = string;
type SidebarMode = 'compact' | 'wide';

export interface SidebarItemProps {
	id: SidebarItemId;
	title: string;
	icon: ReactNode;
	component: ReactNode;
	isDynamic?: boolean;
	preventClose?: boolean;
	onClose?: () => void;
}

// Global atoms for session-based state
const activeItemAtom = atom<Map<SidebarSessionKey, SidebarItemId>>(new Map());
const dynamicItemsAtom = atom<Map<SidebarSessionKey, SidebarItemProps[]>>(new Map());
const sidebarModeAtom = atom<Map<SidebarSessionKey, SidebarMode>>(new Map());

export function useSidebarState(
	sessionKey: SidebarSessionKey,
	staticItems: SidebarItemProps[],
	initialMode: SidebarMode = 'wide',
	defaultItemId?: string
) {
	const [activeItemMap, setActiveItemMap] = useAtom(activeItemAtom);
	const [dynamicItemsMap, setDynamicItemsMap] = useAtom(dynamicItemsAtom);
	const [sidebarModeMap, setSidebarModeMap] = useAtom(sidebarModeAtom);

	// Get current session state
	const activeItemId = activeItemMap.get(sessionKey);
	const dynamicItems = dynamicItemsMap.get(sessionKey) || [];
	const currentMode = sidebarModeMap.get(sessionKey) || initialMode;

	// Direct setters
	const setActiveItemId = (itemId: SidebarItemId | undefined) => {
		setActiveItemMap(prev => {
			const newMap = new Map(prev);
			if (itemId === undefined) {
				newMap.delete(sessionKey);
			} else {
				newMap.set(sessionKey, itemId);
			}
			return newMap;
		});
	};

	const setDynamicItems = (items: SidebarItemProps[]) => {
		setDynamicItemsMap(prev => {
			const newMap = new Map(prev);
			newMap.set(sessionKey, items);
			return newMap;
		});
	};

	const setSidebarMode = (mode: SidebarMode) => {
		setSidebarModeMap(prev => {
			const newMap = new Map(prev);
			newMap.set(sessionKey, mode);
			return newMap;
		});
	};

	// Initialize state on mount
	useEffect(() => {
		// Set initial mode if not already set
		if (!sidebarModeMap.has(sessionKey)) {
			setSidebarMode(initialMode);
		}

		// Set default active item if none is active
		if (!activeItemId && staticItems.length > 0) {
			const initialItemId = defaultItemId || staticItems[0].id;
			setActiveItemId(initialItemId);
		}
	}, [sessionKey, staticItems, defaultItemId, initialMode, activeItemId]);

	// Computed values
	const allItems = [...staticItems, ...dynamicItems];
	const activeItem = allItems.find(item => item.id === activeItemId);

	return {
		// Direct state access
		activeItemId,
		activeItem,
		dynamicItems,
		currentMode,
		staticItems,
		allItems,
		
		// Direct setters
		setActiveItemId,
		setDynamicItems,
		setSidebarMode,
		
		// Cleanup function
		cleanup: () => {
			setActiveItemMap(prev => {
				const newMap = new Map(prev);
				newMap.delete(sessionKey);
				return newMap;
			});
			setDynamicItemsMap(prev => {
				const newMap = new Map(prev);
				newMap.delete(sessionKey);
				return newMap;
			});
			setSidebarModeMap(prev => {
				const newMap = new Map(prev);
				newMap.delete(sessionKey);
				return newMap;
			});
		}
	};
}