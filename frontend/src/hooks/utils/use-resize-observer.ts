import { useEffect, useState } from 'react';

export type Size = { width: number; height: number };

export function useResizeObserver(divRef: React.MutableRefObject<null>, onResize: (newSize: Size) => void) {
	const [size, setSize] = useState({ width: 0, height: 0 });

	useEffect(() => {
		const resizeObserver = new ResizeObserver((entries) => {
			const { width, height } = entries[0].contentRect;
			setSize({ width, height });
		});

		if (divRef.current) {
			resizeObserver.observe(divRef.current);
		}

		return () => {
			if (divRef.current) {
				resizeObserver.unobserve(divRef.current);
			}
		};
	}, []);

	useEffect(() => {
		onResize(size);
	}, [size]);
}
