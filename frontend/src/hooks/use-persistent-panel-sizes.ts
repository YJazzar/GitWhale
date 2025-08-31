import Logger from '@/utils/logger';
import { useState } from 'react';

/**
 * Hook to manage panel sizes with localStorage persistence
 * @param storageKey - Unique key for localStorage
 * @param defaultSizes - Default panel sizes as an array of numbers (percentages)
 * @returns [sizes, updateSizes] tuple
 */
export function usePersistentPanelSizes(storageKey: string, defaultSizes: number[]) {
	const [sizes, setSizes] = useState<number[]>(() => {
		try {
			const stored = localStorage.getItem(storageKey);
			return stored ? JSON.parse(stored) : defaultSizes;
		} catch {
			return defaultSizes;
		}
	});

	const updateSizes = (newSizes: number[]) => {
		setSizes(newSizes);
		try {
			localStorage.setItem(storageKey, JSON.stringify(newSizes));
		} catch (error) {
			Logger.warning(`Failed to save panel sizes to localStorage: ${error}`);
		}
	};

	return [sizes, updateSizes] as const;
}