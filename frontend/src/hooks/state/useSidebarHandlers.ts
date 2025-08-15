import { useCallback } from 'react';
import { useSidebarState, SidebarItemProps } from './useSidebarState';
export type { SidebarItemProps } from './useSidebarState';

type SidebarSessionKey = string;

export function useSidebarHandlers(
	sessionKey: SidebarSessionKey,
	staticItems: SidebarItemProps[],
	initialMode: 'compact' | 'wide' = 'wide',
	defaultItemId?: string,
	onItemClick?: (itemId: string) => void
) {
	const state = useSidebarState(sessionKey, staticItems, initialMode, defaultItemId);

	const addDynamicItem = useCallback((item: SidebarItemProps): void => {
		// Check if item already exists
		const existingItems = state.dynamicItems;
		const itemExists = existingItems.some(existing => existing.id === item.id);
		
		if (!itemExists) {
			const newItems = [...existingItems, { ...item, isDynamic: true }];
			state.setDynamicItems(newItems);
		}
		
		// Set as active item
		state.setActiveItemId(item.id);
		onItemClick?.(item.id);
	}, [state, onItemClick]);

	const removeDynamicItem = useCallback((itemId: string): void => {
		const currentItems = state.dynamicItems;
		const itemToRemove = currentItems.find(item => item.id === itemId);
		
		// Don't remove if preventClose is true
		if (itemToRemove?.preventClose) {
			return;
		}

		const newItems = currentItems.filter(item => item.id !== itemId);
		state.setDynamicItems(newItems);

		// If we're removing the active item, switch to the first static item
		if (state.activeItemId === itemId) {
			const firstStaticItem = state.staticItems[0];
			if (firstStaticItem) {
				state.setActiveItemId(firstStaticItem.id);
				onItemClick?.(firstStaticItem.id);
			}
		}

		// Call the item's onClose callback if it exists
		itemToRemove?.onClose?.();
	}, [state, onItemClick]);

	const setActiveItem = useCallback((itemId: string): void => {
		const item = state.allItems.find(item => item.id === itemId);
		if (item) {
			state.setActiveItemId(itemId);
			onItemClick?.(itemId);
		}
	}, [state, onItemClick]);

	const toggleMode = useCallback((): void => {
		const newMode = state.currentMode === 'compact' ? 'wide' : 'compact';
		state.setSidebarMode(newMode);
	}, [state]);

	const getActiveItem = useCallback((): SidebarItemProps | undefined => {
		return state.activeItem;
	}, [state.activeItem]);

	const getAllItems = useCallback((): SidebarItemProps[] => {
		return state.allItems;
	}, [state.allItems]);

	return {
		// State (read-only)
		activeItem: state.activeItem,
		activeItemId: state.activeItemId,
		dynamicItems: state.dynamicItems,
		currentMode: state.currentMode,
		staticItems: state.staticItems,
		allItems: state.allItems,
		
		// Actions
		addDynamicItem,
		removeDynamicItem,
		setActiveItem,
		toggleMode,
		getActiveItem,
		getAllItems,
		
		// Cleanup
		cleanup: state.cleanup
	};
}