import { useCallback, useEffect, useState } from 'react';

// Predefined zoom levels for consistent scaling
export const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0] as const;
export const DEFAULT_ZOOM = 1.0;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 5.0;

const STORAGE_KEY = 'gitwhale-app-zoom';

export function useAppZoom() {
	const [zoomLevel, setZoomLevel] = useState<number>(() => {
		// Load zoom level from localStorage on initialization
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = parseFloat(stored);
				if (!isNaN(parsed) && parsed >= MIN_ZOOM && parsed <= MAX_ZOOM) {
					return parsed;
				}
			}
		} catch (error) {
			console.warn('Failed to load zoom level from localStorage:', error);
		}
		return DEFAULT_ZOOM;
	});

	// Persist zoom level to localStorage when it changes
	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, zoomLevel.toString());
		} catch (error) {
			console.warn('Failed to save zoom level to localStorage:', error);
		}
	}, [zoomLevel]);

	// Apply zoom level to CSS custom property
	useEffect(() => {
		document.documentElement.style.setProperty('--app-zoom', zoomLevel.toString());
	}, [zoomLevel]);

	const setZoom = useCallback((newZoom: number) => {
		const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
		setZoomLevel(clampedZoom);
	}, []);

	const zoomIn = useCallback(() => {
		setZoomLevel(currentZoom => {
			// Find the next higher predefined zoom level, or increment by 0.25
			const nextLevel = ZOOM_LEVELS.find(level => level > currentZoom);
			if (nextLevel) {
				return Math.min(nextLevel, MAX_ZOOM);
			}
			// If no predefined level found, increment by 0.25
			return Math.min(currentZoom + 0.25, MAX_ZOOM);
		});
	}, []);

	const zoomOut = useCallback(() => {
		setZoomLevel(currentZoom => {
			// Find the next lower predefined zoom level, or decrement by 0.25
			const prevLevel = ZOOM_LEVELS.slice().reverse().find(level => level < currentZoom);
			if (prevLevel) {
				return Math.max(prevLevel, MIN_ZOOM);
			}
			// If no predefined level found, decrement by 0.25
			return Math.max(currentZoom - 0.25, MIN_ZOOM);
		});
	}, []);

	const resetZoom = useCallback(() => {
		setZoomLevel(DEFAULT_ZOOM);
	}, []);

	const canZoomIn = zoomLevel < MAX_ZOOM;
	const canZoomOut = zoomLevel > MIN_ZOOM;
	const isDefaultZoom = Math.abs(zoomLevel - DEFAULT_ZOOM) < 0.01;

	// Format zoom level as percentage for display
	const zoomPercentage = Math.round(zoomLevel * 100);

	return {
		zoomLevel,
		zoomPercentage,
		setZoom,
		zoomIn,
		zoomOut,
		resetZoom,
		canZoomIn,
		canZoomOut,
		isDefaultZoom,
	};
}