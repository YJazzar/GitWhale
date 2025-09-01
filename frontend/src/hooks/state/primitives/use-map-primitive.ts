import { atom, useAtom, WritableAtom } from 'jotai';
import { useCallback, useMemo } from 'react';

type MappedWritableAtom<T> = WritableAtom<
	Map<string, T>,
	[Map<string, T> | ((prev: Map<string, T>) => Map<string, T>)],
	void
>;

export type SetIntentCallback<T> = (prevValue: T | undefined) => T;
export type SetIntent<T> = T | SetIntentCallback<T>;

type MapPrimitive<T> = {
	value: T | undefined;
	set: (newValue: SetIntent<T>) => void;
	kill: () => void;
};

export function createMappedAtom<T>(): MappedWritableAtom<T> {
	return atom<Map<string, T>>(new Map());
}


export function useMapPrimitive<T>(atom: MappedWritableAtom<T>, mapKey: string, defaultValue?: T | undefined): MapPrimitive<T> {
	const [mapData, setMapData] = useAtom(atom);

	const keyedData = useMemo(() => {
		return mapData.get(mapKey);
	}, [mapData, mapKey]);

	const updateMapAtKey = useCallback(
		(newData: SetIntent<T>) => {
			// Set based on a function that depends on the previous state
			if (typeof newData === 'function') {
				setMapData((previousMapData) => {
					const previousKeyedData = previousMapData.get(mapKey);
					const resolvedNewData = (newData as SetIntentCallback<T>)(previousKeyedData);

					const newMap = new Map(previousMapData);
					newMap.set(mapKey, resolvedNewData);
					return newMap;
				});

				return;
			}

			// Set based on the current known state
			const newMap = new Map(mapData);
			newMap.set(mapKey, newData);
			setMapData(newMap);
		},
		[mapData, setMapData, mapKey]
	);

	const deleteKey = useCallback(() => {
		const newMap = new Map(mapData);
		newMap.delete(mapKey);
		setMapData(newMap);
	}, [setMapData, mapKey]);

	return useMemo(() => {
		return {
			value: keyedData ?? defaultValue,
			set: updateMapAtKey,
			kill: deleteKey,
		};
	}, [keyedData, updateMapAtKey, deleteKey]);
}
