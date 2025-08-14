import Logger from '@/utils/logger';
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

type LoadTrackedPrimitive<T> = {
	isLoading: boolean;
	value: T | undefined;
	load: LoadOperation<void>;
	kill: () => void;
};

export function useLoadTrackedMapPrimitive<T>(
	atom: LoadTrackedMappedWritableAtom<T>,
	mapKey: string,
	loadOperation: LoadOperation<T | undefined>
): LoadTrackedPrimitive<T> {
	const [mapData, setMapData] = useAtom(atom);

	const keyedData = useMemo(() => {
		return mapData.get(mapKey);
	}, [mapData, mapKey]);

	const updateAtom = useCallback(
		(isLoading: boolean, newData: T | undefined) => {
			const newMap = new Map(mapData);
			newMap.set(mapKey, {
				isLoading: isLoading,
				data: newData ?? keyedData?.data,
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

	const loadBlock = useCallback(async () => {
		updateAtom(true, undefined);

		try {
			let updatedValue = await loadOperation();
			updateAtom(false, updatedValue);
		} catch (error) {
			Logger.error(`Load operation threw an error: ${error}`, 'useLoadTrackedMapPrimitive');
			updateAtom(false, undefined);
		}
	}, [updateAtom, loadOperation]);

	return {
		isLoading: keyedData?.isLoading ?? false,
		value: keyedData?.data,
		load: loadBlock,
		kill: deleteKey,
	};
}
