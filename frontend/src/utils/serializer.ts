export interface SerializationOptions {
	maxDepth: number;
	detectCircular: boolean;
	includeMetadata: boolean;
	indent: number;
	maxStringLength: number;
	maxArrayLength: number;
	maxObjectProperties: number;
}

export interface SerializationResult<T = string> {
	success: boolean;
	data: T | null;
	error?: string;
	metadata?: SerializationMetadata;
}

export interface SerializationMetadata {
	totalDepth: number;
	circularReferences: number;
	truncatedArrays: number;
	truncatedStrings: number;
	processedObjects: number;
}

interface SerializationContext {
	seen: WeakSet<object>;
	depth: number;
	metadata: SerializationMetadata;
	options: SerializationOptions;
}

interface TypeHandler {
	test: (value: unknown) => boolean;
	serialize: (value: any, context: SerializationContext) => any;
}

class AdvancedSerializer {
	private typeHandlers: Map<string, TypeHandler> = new Map();
	private defaultOptions: SerializationOptions = {
		maxDepth: 50,
		detectCircular: true,
		includeMetadata: false,
		indent: 2,
		maxStringLength: 1000,
		maxArrayLength: 100,
		maxObjectProperties: 50,
	};

	constructor() {
		this.setupDefaultHandlers();
	}

	serialize<T = any>(data: T, options: Partial<SerializationOptions> = {}): SerializationResult<string> {
		const mergedOptions = { ...this.defaultOptions, ...options };
		const context = this.createContext(mergedOptions);

		try {
			const processed = this.processValue(data, context, 0);
			const formatted = this.formatOutput(processed, mergedOptions);

			return {
				success: true,
				data: formatted,
				metadata: mergedOptions.includeMetadata ? context.metadata : undefined,
			};
		} catch (error) {
			return {
				success: false,
				data: null,
				error: error instanceof Error ? error.message : 'Serialization failed',
			};
		}
	}

	private createContext(options: SerializationOptions): SerializationContext {
		return {
			seen: new WeakSet(),
			depth: 0,
			options,
			metadata: {
				totalDepth: 0,
				circularReferences: 0,
				truncatedArrays: 0,
				truncatedStrings: 0,
				processedObjects: 0,
			},
		};
	}

	private processValue(value: unknown, context: SerializationContext, depth: number): any {
		context.metadata.totalDepth = Math.max(context.metadata.totalDepth, depth);

		if (depth > context.options.maxDepth) {
			return '[Max Depth Exceeded]';
		}

		if (this.isPrimitive(value)) {
			return this.handlePrimitive(value, context);
		}

		if (value === null || value === undefined) {
			return value;
		}

		if (typeof value === 'object') {
			if (context.options.detectCircular && context.seen.has(value)) {
				context.metadata.circularReferences++;
				return '[Circular Reference]';
			}

			context.seen.add(value);
			context.metadata.processedObjects++;

			try {
				const handler = this.findTypeHandler(value);
				if (handler) {
					return handler.serialize(value, { ...context, depth: depth + 1 });
				}
				return this.serializeObject(value, { ...context, depth: depth + 1 });
			} finally {
				context.seen.delete(value);
			}
		}

		return this.handlePrimitive(value, context);
	}

	private isPrimitive(value: unknown): boolean {
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

	private handlePrimitive(value: unknown, context: SerializationContext): any {
		if (typeof value === 'string') {
			if (value.length > context.options.maxStringLength) {
				context.metadata.truncatedStrings++;
				return value.substring(0, context.options.maxStringLength) + '... [truncated]';
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

		return value;
	}

	private findTypeHandler(value: unknown): TypeHandler | undefined {
		for (const handler of this.typeHandlers.values()) {
			if (handler.test(value)) {
				return handler;
			}
		}
		return undefined;
	}

	private serializeObject(obj: any, context: SerializationContext): any {
		if (Array.isArray(obj)) {
			return this.serializeArray(obj, context);
		}

		const result: Record<string, any> = {};
		const entries = Object.entries(obj);
		const maxProps = context.options.maxObjectProperties;

		let processedCount = 0;
		for (const [key, value] of entries) {
			if (processedCount >= maxProps) {
				result[`... ${entries.length - maxProps} more properties`] = '[truncated]';
				break;
			}
			result[key] = this.processValue(value, context, context.depth);
			processedCount++;
		}

		return result;
	}

	private serializeArray(arr: any[], context: SerializationContext): any[] {
		const maxLength = context.options.maxArrayLength;

		if (arr.length > maxLength) {
			context.metadata.truncatedArrays++;
			const truncated = arr
				.slice(0, maxLength)
				.map((item) => this.processValue(item, context, context.depth));
			truncated.push(`... ${arr.length - maxLength} more items`);
			return truncated;
		}

		return arr.map((item) => this.processValue(item, context, context.depth));
	}

	private formatOutput(processed: any, options: SerializationOptions): string {
		const space = options.indent;
		return JSON.stringify(processed, null, space);
	}

	private setupDefaultHandlers(): void {
		this.typeHandlers.set('Map', {
			test: (value): value is Map<any, any> => value instanceof Map,
			serialize: (value: Map<any, any>, context) => {
				if (value.size === 0) return { __type: 'Map', __size: 0, __entries: [] };

				const entries = Array.from(value.entries())
					.slice(0, context.options.maxArrayLength)
					.map(([k, v]) => [
						this.processValue(k, context, context.depth),
						this.processValue(v, context, context.depth),
					]);

				const truncated = value.size > context.options.maxArrayLength;
				if (truncated) context.metadata.truncatedArrays++;

				return {
					__type: 'Map',
					__size: value.size,
					__entries: entries,
					__truncated: truncated ? value.size - context.options.maxArrayLength : 0,
				};
			},
		});

		this.typeHandlers.set('Set', {
			test: (value): value is Set<any> => value instanceof Set,
			serialize: (value: Set<any>, context) => {
				if (value.size === 0) return { __type: 'Set', __size: 0, __values: [] };

				const values = Array.from(value)
					.slice(0, context.options.maxArrayLength)
					.map((v) => this.processValue(v, context, context.depth));

				const truncated = value.size > context.options.maxArrayLength;
				if (truncated) context.metadata.truncatedArrays++;

				return {
					__type: 'Set',
					__size: value.size,
					__values: values,
					__truncated: truncated ? value.size - context.options.maxArrayLength : 0,
				};
			},
		});

		this.typeHandlers.set('Date', {
			test: (value): value is Date => value instanceof Date,
			serialize: (value: Date) => ({
				__type: 'Date',
				__value: value.toISOString(),
				__display: value.toString(),
			}),
		});

		this.typeHandlers.set('RegExp', {
			test: (value): value is RegExp => value instanceof RegExp,
			serialize: (value: RegExp) => ({
				__type: 'RegExp',
				__value: value.toString(),
				__flags: value.flags,
				__source: value.source,
			}),
		});

		this.typeHandlers.set('Error', {
			test: (value): value is Error => value instanceof Error,
			serialize: (value: Error, context) => ({
				__type: 'Error',
				__name: value.name,
				__message: value.message,
				__stack: value.stack ? value.stack.substring(0, context.options.maxStringLength) : undefined,
			}),
		});

		this.typeHandlers.set('URL', {
			test: (value): value is URL => value instanceof URL,
			serialize: (value: URL) => ({
				__type: 'URL',
				__value: value.toString(),
				__href: value.href,
				__origin: value.origin,
			}),
		});

		const typedArrayTypes = [
			Int8Array,
			Uint8Array,
			Uint8ClampedArray,
			Int16Array,
			Uint16Array,
			Int32Array,
			Uint32Array,
			Float32Array,
			Float64Array,
		];

		typedArrayTypes.forEach((TypedArrayConstructor) => {
			this.typeHandlers.set(TypedArrayConstructor.name, {
				test: (value): value is InstanceType<typeof TypedArrayConstructor> =>
					value instanceof TypedArrayConstructor,
				serialize: (value: InstanceType<typeof TypedArrayConstructor>, context) => {
					const maxLength = Math.min(value.length, context.options.maxArrayLength);
					const array = Array.from(value.slice(0, maxLength));
					const truncated = value.length > maxLength;

					if (truncated) context.metadata.truncatedArrays++;

					return {
						__type: TypedArrayConstructor.name,
						__length: value.length,
						__values: array,
						__truncated: truncated ? value.length - maxLength : 0,
					};
				},
			});
		});
	}
}

const defaultSerializer = new AdvancedSerializer();

export function serialize(
	data: unknown,
	options?: Partial<SerializationOptions>
): SerializationResult<string> {
	return defaultSerializer.serialize(data, options);
}

export function serializeForDisplay(data: unknown): string {
	const result = serialize(data, {
		maxDepth: 10,
		detectCircular: true,
		includeMetadata: false,
		indent: 2,
		maxStringLength: 500,
		maxArrayLength: 50,
		maxObjectProperties: 30,
	});

	return result.success ? result.data! : '[Serialization Error]';
}

export function serializeForClipboard(data: unknown): string {
	const result = serialize(data, {
		maxDepth: 100,
		detectCircular: true,
		includeMetadata: false,
		indent: 2,
		maxStringLength: 10000,
		maxArrayLength: 1000,
		maxObjectProperties: 200,
	});

	return result.success ? result.data! : JSON.stringify(data, null, 2);
}

export { AdvancedSerializer };
