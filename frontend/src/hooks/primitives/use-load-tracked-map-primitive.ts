import { atom, useAtom, WritableAtom } from 'jotai';
import { useCallback, useMemo } from 'react';

type LoadTrackedEntry<T> = { isLoading: boolean; data: T | undefined };
type MappedAtom<T> = Map<string, LoadTrackedEntry<T>>;
export type LoadTrackedMappedWritableAtom<T> = WritableAtom<MappedAtom<T>, [MappedAtom<T>], void>;

export function createLoadTrackedMappedAtom<T>(): LoadTrackedMappedWritableAtom<T> {
	return atom<MappedAtom<T>>(new Map());
}

// export type LoadTracked

// A wrapped function type that re-returns the callback's output
// used in a triggerLoadOperation that automatically sets the loading state before and after the promise
type LoadOperation<V> = () => Promise<V>;
type LoadOperationCallback = <V>(callback: LoadOperation<V>) => Promise<V>;

type LoadTrackedPrimitive<T> = {
	isLoading: boolean;
	value: T | undefined;
	set: (newValue: T) => void;
	useLoadOperation: <V>(innerLoadBlock: () => Promise<V>) => () => Promise<V>;
	kill: () => void;
};

export function useLoadTrackedMapPrimitive<T>(
	atom: LoadTrackedMappedWritableAtom<T>,
	mapKey: string
): LoadTrackedPrimitive<T> {
	const [mapData, setMapData] = useAtom(atom);

	const keyedData = useMemo(() => {
		return mapData.get(mapKey);
	}, [mapData, mapKey]);

	const updateMapAtKey = useCallback(
		(newData: T) => {
			const newMap = new Map(mapData);
			newMap.set(mapKey, {
				isLoading: keyedData?.isLoading ?? false,
				data: newData,
			});
			setMapData(newMap);
		},
		[mapData, setMapData, mapKey]
	);

	const deleteKey = useCallback(() => {
		const newMap = new Map(mapData);
		newMap.delete(mapKey);
		setMapData(newMap);
	}, [setMapData, mapKey]);

	const setLoading = useCallback(
		(newLoadingState: boolean) => {
			const newMap = new Map(mapData);
			newMap.set(mapKey, {
				isLoading: newLoadingState,
				data: keyedData?.data,
			});
			setMapData(newMap);
		},
		[mapData, setMapData, mapKey]
	);

	const loadBlock = useCallback(
		<V>(innerLoadBlock: () => Promise<V>) =>
			async () => {
				setLoading(true);

				let returnValue: V | undefined;
				try {
					returnValue = await innerLoadBlock();
				} finally {
					setLoading(false);
				}

				setLoading(false);
				return returnValue;
			},
		[setLoading]
	);

	return {
		isLoading: keyedData?.isLoading ?? false,
		value: keyedData?.data,
		set: updateMapAtKey,
		useLoadOperation: loadBlock,
		kill: deleteKey,
	};
}
