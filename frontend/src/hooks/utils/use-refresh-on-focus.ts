import Logger from '@/utils/logger';
import { useEffect, useState } from 'react';

export function useRefreshOnFocus(fetchDataFunction: () => void) {
	const [isLoading, setIsLoading] = useState(true);

	const fetchData = async () => {
		setIsLoading(true);
		try {
			await fetchDataFunction();
		} catch (err) {
			Logger.error(`uncaught exception while refreshing on focus: ${err}`);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		//re-run whenever the parent component re-mounts (not just when the browser gets focused)
		fetchData()
	}, [])

	useEffect(() => {
		const handleFocus = () => {
			fetchData();
		};

		window.addEventListener('focus', handleFocus);

		return () => {
			window.removeEventListener('focus', handleFocus);
		};
	}, [fetchDataFunction]);

	return { isLoading };
}
