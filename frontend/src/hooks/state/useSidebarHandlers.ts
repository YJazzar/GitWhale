import { useCallback } from 'react';
import { useSidebarState, SidebarItemProps } from './useSidebarState';
import Logger from '@/utils/logger';
import { r } from 'react-router/dist/development/fog-of-war-DU_DzpDb';
export type { SidebarItemProps } from './useSidebarState';

type SidebarSessionKey = string;

export function useSidebarHandlers(
	sessionKey: SidebarSessionKey,
	initialValues?: {
		staticItems: SidebarItemProps[];
		initialMode: 'compact' | 'wide';
		defaultItemId?: string;
	}
) {
	const state = useSidebarState(sessionKey, initialValues);

	const addDynamicItem = (item: SidebarItemProps): void => {
		// Check if item already exists
		const existingItems = state.dynamicItems;
		const itemExists = existingItems?.some((existing) => existing.id === item.id);

		if (!itemExists) {
			const newItems = [...(existingItems ?? []), { ...item, isDynamic: true }];
			state.setDynamicItems(newItems);
		}

		// Set as active item
		state.setActiveItemId(item.id);
		Logger.debug(`Clicked sidebar item: ${item.id}`, 'useSidebarHandlers');
	};

	const removeDynamicItem = (itemId: string): void => {
		const currentItems = state.dynamicItems;
		if (!currentItems) {
			return; // nothing to remove
		}

		const itemToRemove = currentItems.find((item) => item.id === itemId);

		// Don't remove if preventClose is true
		if (itemToRemove?.preventClose) {
			return;
		}

		const newItems = currentItems.filter((item) => item.id !== itemId);
		state.setDynamicItems(newItems);

		// If we're removing the active item, switch to the first static item
		if (state.activeItemId === itemId) {
			const firstStaticItem = state.staticItems?.[0];
			if (firstStaticItem) {
				state.setActiveItemId(firstStaticItem.id);
				Logger.debug(`Clicked sidebar item: ${firstStaticItem.id}`, 'useSidebarHandlers');
			}
		}

		// Call the item's onClose callback if it exists
		itemToRemove?.onClose?.();
	};

	const setActiveItem = (itemId: string): void => {
		const item = state.allItems.find((item) => item.id === itemId);
		if (item) {
			state.setActiveItemId(itemId);
			Logger.debug(`Clicked sidebar item: ${itemId}`, 'useSidebarHandlers');
		}
	};

	const toggleMode = (): void => {
		const newMode = state.currentMode === 'compact' ? 'wide' : 'compact';
		state.setSidebarMode(newMode);
	};

	const getActiveItem = (): SidebarItemProps | undefined => {
		return state.activeItem;
	};

	const getAllItems = (): SidebarItemProps[] => {
		return state.allItems;
	};

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
		cleanup: state.cleanup,
	};
}
