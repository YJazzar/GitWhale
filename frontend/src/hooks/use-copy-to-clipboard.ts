import Logger from '@/utils/logger';
import { useState, useEffect } from 'react';

export interface UseCopyToClipboardReturn {
	copyToClipboard: (text: string) => Promise<void>;
	copySuccess: boolean;
	resetCopySuccess: () => void;
}

export function useCopyToClipboard(resetDelay: number = 800): UseCopyToClipboardReturn {
	const [copySuccess, setCopySuccess] = useState(false);

	const copyToClipboard = async (text: string): Promise<void> => {
		try {
			await navigator.clipboard.writeText(text);
			setCopySuccess(true);
		} catch (err) {
			Logger.error(`Failed to copy text to clipboard: ${err}`);
			throw err;
		}
	};

	const resetCopySuccess = () => {
		setCopySuccess(false);
	};

	// Auto-reset copy success state after delay
	useEffect(() => {
		if (copySuccess) {
			const timer = setTimeout(() => {
				setCopySuccess(false);
			}, resetDelay);
			return () => clearTimeout(timer);
		}
	}, [copySuccess, resetDelay]);

	return {
		copyToClipboard,
		copySuccess,
		resetCopySuccess,
	};
}