import { useAtom, WritableAtom } from 'jotai';
import { useCallback, useMemo } from 'react';

type MappedWritableAtom<T> = WritableAtom<Map<string, T>, [Map<string, T>], void>;

type MapPrimitive<T> = {
	value: T | undefined;
	set: (newValue: T) => void;
	kill: () => void;
};

export function useMapPrimitive<T>(atom: MappedWritableAtom<T>, mapKey: string): MapPrimitive<T> {
	const [mapData, setMapData] = useAtom(atom);

	const keyedData = useMemo(() => {
		return mapData.get(mapKey);
	}, [mapData, mapKey]);

	const updateMapAtKey = useCallback(
		(newData: T) => {
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

	return {
		value: keyedData, 
		set: updateMapAtKey, 
		kill: deleteKey
	};
}
