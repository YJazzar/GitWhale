import { atom } from 'jotai';
import { ReactNode, useEffect } from 'react';
import { useMapPrimitive } from './primitives/use-map-primitive';

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
const staticItemsAtom = atom<Map<SidebarSessionKey, SidebarItemProps[]>>(new Map());
const dynamicItemsAtom = atom<Map<SidebarSessionKey, SidebarItemProps[]>>(new Map());
const sidebarModeAtom = atom<Map<SidebarSessionKey, SidebarMode>>(new Map());

export function useSidebarState(
	sessionKey: SidebarSessionKey,
	initialValues?: {
		staticItems: SidebarItemProps[];
		initialMode: SidebarMode;
		defaultItemId?: string;
	}
) {
	const _activeItemPrim = useMapPrimitive(activeItemAtom, sessionKey);
	const _staticItemsPrim = useMapPrimitive(staticItemsAtom, sessionKey);
	const _dynamicItemsPrim = useMapPrimitive(dynamicItemsAtom, sessionKey);
	const _sidebarModePrim = useMapPrimitive(sidebarModeAtom, sessionKey);

	// Get current session state
	const activeItemId = _activeItemPrim.value;
	const dynamicItems = _dynamicItemsPrim.value;
	const currentMode = _sidebarModePrim.value;

	// Direct setters
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

	// Initialize state on mount
	useEffect(() => {
		if (!initialValues) {
			// In code path that shouldn't be initializing any state
			return;
		}

		const { initialMode, defaultItemId, staticItems } = initialValues;

		// Set initial mode if not already set
		if (!_sidebarModePrim.value) {
			setSidebarMode(initialMode);
		}

		// Set default active item if none is active
		if (!activeItemId && staticItems.length > 0) {
			const initialItemId = defaultItemId || staticItems[0].id;
			setActiveItemId(initialItemId);
		}

		// Store the static items
		if (!_staticItemsPrim.value && staticItems.length > 0) {
			_staticItemsPrim.set(staticItems);
		}
	}, [sessionKey, initialValues, activeItemId, setSidebarMode, setActiveItemId, _staticItemsPrim]);

	// Computed values
	const allItems = [...(_staticItemsPrim.value ?? []), ...(_dynamicItemsPrim.value ?? [])];
	const activeItem = allItems.find((item) => item.id === activeItemId);

	return {
		// Direct state access
		activeItemId,
		activeItem,
		dynamicItems,
		currentMode,
		staticItems: _staticItemsPrim.value,
		allItems,

		// Direct setters
		setActiveItemId,
		setDynamicItems,
		setSidebarMode,

		// Cleanup function
		cleanup: () => {
			_activeItemPrim.kill();
			_dynamicItemsPrim.kill();
			_sidebarModePrim.kill();
		},
	};
}

export function useSidebarStateAtoms() {
	return { activeItemAtom, staticItemsAtom, dynamicItemsAtom, sidebarModeAtom };
}
