import { atom, useAtom } from 'jotai';
import { useEffect } from 'react';
import { ReactNode } from 'react';

type SidebarSessionKey = string;
type SidebarItemId = string;
type SidebarMode = 'compact' | 'wide';

export interface SidebarItemProps {
	// A uniquely identifiable key for the sidebar item
	id: SidebarItemId;

	// The title to display (in wide mode)
	title: string;

	// The icon to display
	icon: ReactNode;

	// The component to render when this item is active
	component: ReactNode;

	// Whether this is a dynamic item (can be closed)
	isDynamic?: boolean;

	// Prevents the item from being closed (overrides isDynamic)
	preventClose?: boolean;

	// Callback when the item is closed
	onClose?: () => void;
}

export type SidebarProps = {
	// Session key to isolate sidebar state per session
	sidebarSessionKey: SidebarSessionKey;

	// List of static sidebar items (always present)
	staticItems: SidebarItemProps[];

	// Initial display mode
	initialMode?: SidebarMode;

	// Default item to activate if none specified
	defaultItemId?: string;

	// Callback when an item is clicked
	onItemClick?: (itemId: string) => void;
};

// Global atoms to store state per session
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

	// Setters for session-specific state
	const setActiveItemId = (itemId: SidebarItemId | undefined) => {
		const newMap = new Map(activeItemMap);
		if (itemId === undefined) {
			newMap.delete(sessionKey);
		} else {
			newMap.set(sessionKey, itemId);
		}
		setActiveItemMap(newMap);
	};

	const setDynamicItems = (items: SidebarItemProps[]) => {
		const newMap = new Map(dynamicItemsMap);
		newMap.set(sessionKey, items);
		setDynamicItemsMap(newMap);
	};

	const setSidebarMode = (mode: SidebarMode) => {
		const newMap = new Map(sidebarModeMap);
		newMap.set(sessionKey, mode);
		setSidebarModeMap(newMap);
	};

	const toggleSidebarMode = () => {
		const newMode = currentMode === 'compact' ? 'wide' : 'compact';
		setSidebarMode(newMode);
	};

	// Combined items list (static + dynamic)
	const allItems = [...staticItems, ...dynamicItems];
	const activeItem = allItems.find((item) => item.id === activeItemId);

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
	}, [sessionKey, staticItems, defaultItemId, initialMode, activeItemId, sidebarModeMap, setSidebarMode, setActiveItemId]);

	return {
		// State setters with convenient API
		activeItem: {
			get: () => activeItem,
			getId: () => activeItemId,
			setId: setActiveItemId,
		},
		allItems: [...staticItems, ...dynamicItems],
		staticItems,
		dynamicItems: {
			get: () => dynamicItems,
			set: setDynamicItems,
		},
		sidebarMode: {
			get: () => currentMode,
			set: setSidebarMode,
			toggle: toggleSidebarMode,
		},
	};
}