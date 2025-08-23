import { useCallback, useState } from 'react';

export interface ContextMenuAction<T = unknown> {
	id: string;
	label: string;
	icon?: React.ComponentType<{ className?: string }>;
	onClick: (contextData: T) => void;
	disabled?: (contextData: T) => boolean;
	separator?: boolean;
}

interface ContextMenuState<T> {
	isOpen: boolean;
	position: { x: number; y: number };
	contextData: T;
}

interface UseContextMenuProps<T> {
	actions: ContextMenuAction<T>[];
	shouldShow?: (contextData: T) => boolean;
}

interface UseContextMenuReturn<T> {
	contextMenuState: ContextMenuState<T> | null;
	showContextMenu: (event: React.MouseEvent, contextData: T) => void;
	hideContextMenu: () => void;
}

export function useContextMenu<T = unknown>({
	actions,
	shouldShow,
}: UseContextMenuProps<T>): UseContextMenuReturn<T> {
	const [contextMenuState, setContextMenuState] = useState<ContextMenuState<T> | null>(null);

	const showContextMenu = useCallback(
		(event: React.MouseEvent, contextData: T) => {
			event.preventDefault();
			event.stopPropagation();

			// Check if context menu should be shown for this data
			if (shouldShow && !shouldShow(contextData)) {
				return;
			}

			// Calculate position, accounting for screen edges
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;
			const menuWidth = 220; // Estimated menu width
			const menuHeight = actions.length * 40; // Estimated menu height

			let x = event.clientX;
			let y = event.clientY;

			// Prevent overflow on the right
			if (x + menuWidth > viewportWidth) {
				x = viewportWidth - menuWidth - 10;
			}

			// Prevent overflow on the bottom
			if (y + menuHeight > viewportHeight) {
				y = viewportHeight - menuHeight - 10;
			}

			// Ensure minimum position
			x = Math.max(10, x);
			y = Math.max(10, y);

			setContextMenuState({
				isOpen: true,
				position: { x, y },
				contextData,
			});
		},
		[actions.length, shouldShow]
	);

	const hideContextMenu = useCallback(() => {
		setContextMenuState(null);
	}, []);

	return {
		contextMenuState,
		showContextMenu,
		hideContextMenu,
	};
}
