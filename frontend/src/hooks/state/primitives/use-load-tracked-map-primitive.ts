import Logger from '@/utils/logger';
import { atom, useAtom, WritableAtom } from 'jotai';
import { useCallback, useMemo } from 'react';
import { SetIntent, SetIntentCallback } from './use-map-primitive';

type LoadTrackedEntry<T> = { isLoading: boolean; data: T | undefined };
type MappedAtom<T> = Map<string, LoadTrackedEntry<T>>;
export type LoadTrackedMappedWritableAtom<T> = WritableAtom<
	MappedAtom<T>,
	[MappedAtom<T> | ((prev: MappedAtom<T>) => MappedAtom<T>)],
	void
>;

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
	set: (newValue: SetIntent<T>) => void;
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
		(isLoading: boolean, newData: SetIntent<T> | undefined) => {
			// Set based on a function that depends on the previous state
			if (typeof newData === 'function') {
				setMapData((previousMapData) => {
					const previousKeyedData = previousMapData.get(mapKey);
					const resolvedNewData = (newData as SetIntentCallback<T>)(previousKeyedData?.data);

					const newMap = new Map(previousMapData);
					newMap.set(mapKey, {
						isLoading: isLoading,
						data: resolvedNewData,
					});
					return newMap;
				});

				return;
			}

			// Set based on the current known state
			const newMap = new Map(mapData);
			newMap.set(mapKey, {
				isLoading: isLoading,
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

	return useMemo(() => {
		return {
			isLoading: keyedData?.isLoading ?? false,
			value: keyedData?.data,
			load: loadBlock,
			kill: deleteKey,
			set: (newValue: SetIntent<T>) => updateAtom(keyedData?.isLoading ?? false, newValue),
		};
	}, [keyedData, loadBlock, deleteKey]);
}
