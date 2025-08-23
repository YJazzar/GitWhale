import { useEffect, useRef } from 'react';

export function useLogPreviousValue(value: unknown) {
	const ref = useRef<unknown>();

	useEffect(() => {
		if (ref.current !== undefined) {
			console.log('Value changed:', {
				previous: ref.current,
				current: value,
			});
		}
		ref.current = value;
	}, [value]);

	return ref.current;
}
