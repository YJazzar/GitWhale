import { useEffect } from 'react';

type KeyboardShortcutOptions = {
	allowDefault?: boolean;
	continuePropagating?: boolean;
};

// Detect platform for keyboard shortcut
export function useKeyboardHotkeyDisplay(key: string, addSpaces: boolean = false) {
	// Detect platform for keyboard shortcut
	const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
	const shortcutKey = isMac ? '⌘' : 'Ctrl';

	const stringElements = [shortcutKey, '+', key];

	return addSpaces ? stringElements.join(' ') : stringElements.join('');
}

export function useKeyboardShortcut(
	// ref: RefObject<HTMLElement>,
	key: string,
	callback: (event: KeyboardEvent) => void,
	options?: KeyboardShortcutOptions
) {
	// Handles the keyboard shortcut to close stuff
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === key) {
				if (options?.allowDefault !== true) {
					event.preventDefault();
				}
				if (options?.continuePropagating !== true) {
					event.stopPropagation();
				}

				callback(event);
			}
		};

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [key, callback]);
}
