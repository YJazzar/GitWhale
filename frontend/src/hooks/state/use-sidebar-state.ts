import { atom, useAtom } from 'jotai';
import { useEffect } from 'react';
import { ReactNode } from 'react';
import { useMapPrimitive } from './primitives/use-map-primitive';

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
	const _activeItemPrim = useMapPrimitive(activeItemAtom, sessionKey);
	const _dynamicItemsPrim = useMapPrimitive(dynamicItemsAtom, sessionKey);
	const _sidebarModePrim = useMapPrimitive(sidebarModeAtom, sessionKey);

	// Get current session state
	const activeItemId = _activeItemPrim.value;
	const dynamicItems = _dynamicItemsPrim.value || [];
	const currentMode = _sidebarModePrim.value || initialMode;

	// Setters for session-specific state
	const setActiveItemId = (itemId: SidebarItemId | undefined) => {
		if (itemId === undefined) {
			_activeItemPrim.kill();
		} else {
			_activeItemPrim.set(itemId);
		}
	};

	const setDynamicItems = (items: SidebarItemProps[]) => {
		_dynamicItemsPrim.set(items);
	};

	const setSidebarMode = (mode: SidebarMode) => {
		_sidebarModePrim.set(mode);
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
		if (!_sidebarModePrim.value) {
			setSidebarMode(initialMode);
		}

		// Set default active item if none is active
		if (!activeItemId && staticItems.length > 0) {
			const initialItemId = defaultItemId || staticItems[0].id;
			setActiveItemId(initialItemId);
		}
	}, [
		sessionKey,
		staticItems,
		defaultItemId,
		initialMode,
		activeItemId,
		_sidebarModePrim,
		setSidebarMode,
		setActiveItemId,
	]);

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
		onClose: () => {
			_activeItemPrim.kill();
			_dynamicItemsPrim.kill();
			_sidebarModePrim.kill();
		},
	};
}
