// class AdvancedSerializer {
// 	private findTypeHandler(value: unknown): TypeHandler | undefined {
// 		for (const handler of this.typeHandlers.values()) {
// 			if (handler.test(value)) {
// 				return handler;
// 			}
// 		}
// 		return undefined;
// 	}

import React from 'react';
import Logger from './logger';

// 	private formatOutput(processed: any, options: SerializationOptions): string {
// 		const space = options.indent;
// 		return JSON.stringify(processed, null, space);
// 	}

// 	private setupDefaultHandlers(): void {
// 		this.typeHandlers.set('Map', {
// 			test: (value): value is Map<any, any> => value instanceof Map,
// 			serialize: (value: Map<any, any>, context) => {
// 				if (value.size === 0) return { __type: 'Map', __size: 0, __entries: [] };

// 				const entries = Array.from(value.entries())
// 					.slice(0, context.options.maxArrayLength)
// 					.map(([k, v]) => [
// 						this.processValue(k, context, context.depth),
// 						this.processValue(v, context, context.depth),
// 					]);

// 				const truncated = value.size > context.options.maxArrayLength;
// 				if (truncated) context.metadata.truncatedArrays++;

// 				return {
// 					__type: 'Map',
// 					__size: value.size,
// 					__entries: entries,
// 					__truncated: truncated ? value.size - context.options.maxArrayLength : 0,
// 				};
// 			},
// 		});

// 		this.typeHandlers.set('Set', {
// 			test: (value): value is Set<any> => value instanceof Set,
// 			serialize: (value: Set<any>, context) => {
// 				if (value.size === 0) return { __type: 'Set', __size: 0, __values: [] };

// 				const values = Array.from(value)
// 					.slice(0, context.options.maxArrayLength)
// 					.map((v) => this.processValue(v, context, context.depth));

// 				const truncated = value.size > context.options.maxArrayLength;
// 				if (truncated) context.metadata.truncatedArrays++;

// 				return {
// 					__type: 'Set',
// 					__size: value.size,
// 					__values: values,
// 					__truncated: truncated ? value.size - context.options.maxArrayLength : 0,
// 				};
// 			},
// 		});

// 		this.typeHandlers.set('Date', {
// 			test: (value): value is Date => value instanceof Date,
// 			serialize: (value: Date) => ({
// 				__type: 'Date',
// 				__value: value.toISOString(),
// 				__display: value.toString(),
// 			}),
// 		});

// 		this.typeHandlers.set('RegExp', {
// 			test: (value): value is RegExp => value instanceof RegExp,
// 			serialize: (value: RegExp) => ({
// 				__type: 'RegExp',
// 				__value: value.toString(),
// 				__flags: value.flags,
// 				__source: value.source,
// 			}),
// 		});

// 		this.typeHandlers.set('Error', {
// 			test: (value): value is Error => value instanceof Error,
// 			serialize: (value: Error, context) => ({
// 				__type: 'Error',
// 				__name: value.name,
// 				__message: value.message,
// 				__stack: value.stack ? value.stack.substring(0, context.options.maxStringLength) : undefined,
// 			}),
// 		});

// 		this.typeHandlers.set('URL', {
// 			test: (value): value is URL => value instanceof URL,
// 			serialize: (value: URL) => ({
// 				__type: 'URL',
// 				__value: value.toString(),
// 				__href: value.href,
// 				__origin: value.origin,
// 			}),
// 		});

// 		const typedArrayTypes = [
// 			Int8Array,
// 			Uint8Array,
// 			Uint8ClampedArray,
// 			Int16Array,
// 			Uint16Array,
// 			Int32Array,
// 			Uint32Array,
// 			Float32Array,
// 			Float64Array,
// 		];

// 		typedArrayTypes.forEach((TypedArrayConstructor) => {
// 			this.typeHandlers.set(TypedArrayConstructor.name, {
// 				test: (value): value is InstanceType<typeof TypedArrayConstructor> =>
// 					value instanceof TypedArrayConstructor,
// 				serialize: (value: InstanceType<typeof TypedArrayConstructor>, context) => {
// 					const maxLength = Math.min(value.length, context.options.maxArrayLength);
// 					const array = Array.from(value.slice(0, maxLength));
// 					const truncated = value.length > maxLength;

// 					if (truncated) context.metadata.truncatedArrays++;

// 					return {
// 						__type: TypedArrayConstructor.name,
// 						__length: value.length,
// 						__values: array,
// 						__truncated: truncated ? value.length - maxLength : 0,
// 					};
// 				},
// 			});
// 		});
// 	}
// }

// Main value formatting function

function isPrimitive(value: unknown): boolean {
	if (value === null || value === undefined) {
		return true;
	}

	const type = typeof value;
	return (
		type === 'string' ||
		type === 'number' ||
		type === 'boolean' ||
		type === 'bigint' ||
		type === 'symbol' ||
		type === 'function'
	);
}

function handlePrimitive(value: unknown, options: SerializerOptions): string | boolean | number | undefined | null {
	if (value === undefined || value === null) {
		return value;
	}

	if (typeof value === 'boolean' || typeof value === 'number') {
		return value;
	}

	if (typeof value === 'string') {
		if (value.length > options.maxStringLength) {
			return value.substring(0, options.maxStringLength) + '... [truncated]';
		}
		return value;
	}

	if (typeof value === 'function') {
		return `[Function: ${value.name || 'anonymous'}]`;
	}

	if (typeof value === 'bigint') {
		return `BigInt(${value.toString()})`;
	}

	if (typeof value === 'symbol') {
		return `Symbol(${value.description || ''})`;
	}

	return `[Not a Primitive]: ${typeof value}`;
}

type SerializerOptions = {
	maxDepth: number;
	maxStringLength: number;
	indentLevel: number;
};

function getSpaces(numberOfSpaces: number) {
	let acc = '';
	for (let i = 0; i < numberOfSpaces; i++) {
		acc += ' ';
	}
	return acc;
}

export function serialize(object: unknown): string {
	return formatDisplayValue(object, 0, {
		maxDepth: 15,
		maxStringLength: 100,
		indentLevel: 3,
	});
}

function serializeObject(object: Record<string, unknown> | null, depth: number, options: SerializerOptions) {
	if (!object || Object.keys(object).length === 0) return '{}';

	const indent = getSpaces(depth * options.indentLevel);
	const nextIndent = getSpaces((depth + 1) * options.indentLevel);

	const keyValueStrings = Object.keys(object)
		.map((key) => {
			const value = object[key];
			return `${nextIndent}${key}: ${formatDisplayValue(value, depth + 1, options)}`;
		})
		.join(',\n');

	return `{\n${keyValueStrings}\n${indent}}`;
}

function formatDisplayValue(val: unknown, depth: number, options: SerializerOptions): string {
	Logger.debug(`called format on:  ${val}`);

	// Prevent infinite recursion with depth limit
	if (depth > options.maxDepth) {
		return '[Max Depth Reached]';
	}

	if (isPrimitive(val)) {
		return `${handlePrimitive(val, options)}`;
	}

	if (typeof val === 'object') {
		if (React.isValidElement(val)) {
			return serializeReactComponent(val, depth, options);
		}

		// Handle Map objects specially
		if (val instanceof Map) {
			return serializeMap(val, depth, options);
		}

		// Handle Set objects specially
		if (val instanceof Set) {
			return serializeSet(val, depth, options);
		}

		// Handle Arrays specially
		if (Array.isArray(val)) {
			return serializeArray(val, depth, options);
		}

		return serializeObject(val as Record<string, unknown>, depth, options);
	}

	return String(val);
}

function serializeArray(val: Array<unknown>, depth: number, options: SerializerOptions) {
	if (val.length === 0) return 'Array(0) []';

	const items = val.slice(0, 10); // Limit to first 10 items
	const indent = getSpaces(depth * options.indentLevel);
	const nextIndent = getSpaces((depth + 1) * options.indentLevel);

	const formattedItems = items.map((item) => {
		return formatDisplayValue(item, depth + 1, options);
	});

	// For simple arrays (strings, numbers, booleans), show on one line if short
	if (val.length <= 8 && depth === 0) {
		const isSimpleArray = items.every(
			(item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
		);

		if (isSimpleArray) {
			return `Array(${val.length}) [${formattedItems.join(', ')}]`;
		}
	}

	const truncated = val.length > 10 ? `\n${nextIndent}... ${val.length - 10} more` : '';
	const formattedItemsWithIndent = formattedItems.map((item) => `${nextIndent}${item}`).join(',\n');

	return `Array(${val.length}) [\n${formattedItemsWithIndent}${truncated}\n${indent}]`;
}

function serializeMap(val: Map<unknown, unknown>, depth: number, options: SerializerOptions) {
	if (val.size === 0) return 'Map(0) {}';

	const entries = Array.from(val.entries());
	const indent = getSpaces(depth * options.indentLevel);
	const nextIndent = getSpaces((depth + 1) * options.indentLevel);

	const formattedEntries = entries
		.map(([key, value]) => {
			const keyStr = formatDisplayValue(key, depth + 1, options);
			const valueStr = formatDisplayValue(value, depth + 1, options);
			return `${nextIndent}${keyStr} => ${valueStr}`;
		})
		.join(',\n');

	return `Map(${val.size}) {\n${formattedEntries}\n${indent}}`;
}

function serializeSet(val: Set<unknown>, depth: number, options: SerializerOptions) {
	if (val.size === 0) return 'Set(0) {}';

	const values = Array.from(val);
	const indent = getSpaces(depth * options.indentLevel);
	const nextIndent = getSpaces((depth + 1) * options.indentLevel);

	const formattedValues = values
		.map((v) => {
			return formatDisplayValue(v, depth + 1, options);
		})
		.map((value) => `${nextIndent}${value}`)
		.join(',\n');

	return `Set(${val.size}) {\n${formattedValues}\n${indent}}`;
}

function serializeReactComponent(component: React.ReactElement, depth: number, options: SerializerOptions) {
	const type = component.type;

	if (typeof type === 'string') {
		return `React.ReactElement(${type}) ${formatDisplayValue(component.props, depth, options)}`;
	}

	const componentName = type?.name ?? (type as unknown as { displayName?: string })?.displayName;

	return `React.ReactElement(${componentName}) ${formatDisplayValue(component.props, depth, options)}`;
}
