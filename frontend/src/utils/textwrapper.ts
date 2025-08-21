/**
 * Core text wrapping functionality - TypeScript translation from F#
 * Focuses on the essential wrapping logic without language parsing complexity
 */

// Type definitions
export interface Position {
	line: number;
	character: number;
}

export interface RewrapSelection {
	anchor: Position;
	active: Position;
}

export interface WrapSettings {
	column: number;
	tabWidth?: number;
}

export interface Edit {
	startLine: number;
	endLine: number;
	lines: string[];
	selections: RewrapSelection[];
}

export interface WrapResult {
	lines: string[];
	selections: RewrapSelection[];
}

export class Line {
	public readonly prefix: string;
	public readonly content: string;

	constructor(prefix: string | Line, content?: string | number) {
		if (typeof prefix === 'string' && typeof content === 'string') {
			this.prefix = prefix;
			this.content = content;
		} else if (typeof prefix === 'string' && typeof content === 'number') {
			// Constructor: new Line(str, splitAt)
			const str = prefix;
			const splitAt = Math.min(content, str.length);
			this.prefix = str.substring(0, splitAt);
			this.content = str.substring(splitAt);
		} else if (prefix instanceof Line) {
			// Copy constructor
			this.prefix = prefix.prefix;
			this.content = prefix.content;
		} else {
			throw new Error('Invalid Line constructor arguments');
		}
	}

	get split(): number {
		return this.prefix.length;
	}

	toString(): string {
		return this.prefix + this.content;
	}

	static adjustSplit(delta: number, line: Line): Line {
		if (line.content === '') return line;
		const newSplitAt = line.prefix.length + delta;
		const fullText = line.prefix + line.content;
		return new Line(fullText, newSplitAt);
	}

	static trimUpTo(indent: number, line: Line): Line {
		const trimmed = line.content.trimStart();
		const maxIndent = line.prefix.length + line.content.length - trimmed.length;
		const newSplitAt = Math.min(indent, maxIndent);
		const fullText = line.prefix + line.content;
		return new Line(fullText, newSplitAt);
	}

	static mapRight(fn: (content: string) => string, line: Line): Line {
		return new Line(line.prefix, fn(line.content));
	}

	static mapLeft(fn: (prefix: string) => string, line: Line): Line {
		return new Line(fn(line.prefix), line.content);
	}
}

// Text width calculation utilities
export function charWidth(tabSize: number, column: number, charCode: number): number {
	switch (true) {
		case charCode === 0x0009: // Tab
			return tabSize - (column % tabSize);
		case charCode === 0x0000: // Placeholder for non-breaking space
			return 1;
		case charCode < 0x0020: // Control characters
			return 0;
		case charCode < 0x2e80: // Regular ASCII/Latin
			return 1;
		case charCode >= 0x2e80 && charCode <= 0xd7af: // CJK
		case charCode >= 0xf900 && charCode <= 0xfaff: // CJK Compatibility
		case charCode >= 0xff01 && charCode <= 0xff5e: // Fullwidth forms
			return 2;
		default:
			return 1;
	}
}

export function strWidth(tabSize: number, str: string, offset: number = 0): number {
	const tabWidth = Math.max(tabSize, 1);
	let acc = offset;

	for (let i = 0; i < str.length; i++) {
		acc += charWidth(tabWidth, acc, str.charCodeAt(i));
	}

	return acc - offset;
}

export function tabsToSpaces(tabSize: number, str: string): string {
	const parts = str.split('\t');
	if (parts.length === 1) return str;

	let result = '';
	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i];
		const padTo = Math.ceil((result.length + part.length) / tabSize + 1) * tabSize;
		result += part.padEnd(padTo);
	}
	result += parts[parts.length - 1];

	return result;
}

// Line utilities
export function isBlank(line: string): boolean {
	return !line || !line.trim();
}

export function leadingWhitespace(line: string): string {
	const match = line.match(/^\s*/);
	return match ? match[0] : '';
}

export function containsText(line: string): boolean {
	return /[A-Za-z0-9\u00C0-\uFFFF]/.test(line) && !/^=(begin|end)\s*$/.test(line);
}

// Selection and range utilities
export class LineRange {
	constructor(public readonly startLine: number, public readonly endLine: number) {}

	get length(): number {
		return Math.max(this.endLine - this.startLine + 1, 0);
	}

	get isEmpty(): boolean {
		return this.endLine < this.startLine;
	}

	static fromSelection(selection: RewrapSelection): LineRange {
		const startLine = Math.min(selection.active.line, selection.anchor.line);
		const endLine = Math.max(selection.active.line, selection.anchor.line);
		const isEmpty = startLine === endLine && selection.anchor.character === selection.active.character;

		if (isEmpty) {
			return new LineRange(startLine, startLine - 1);
		}

		// Handle selections ending at column 0
		if (selection.active.line > selection.anchor.line && selection.active.character === 0) {
			return new LineRange(selection.anchor.line, selection.active.line - 1);
		}
		if (selection.anchor.line > selection.active.line && selection.anchor.character === 0) {
			return new LineRange(selection.active.line, selection.anchor.line - 1);
		}

		return new LineRange(startLine, endLine);
	}

	intersects(other: LineRange): boolean {
		if (other.isEmpty) return other.intersects(this);
		if (this.isEmpty) {
			return this.startLine >= other.startLine && this.startLine <= other.endLine;
		}
		return Math.max(this.startLine, other.startLine) <= Math.min(this.endLine, other.endLine);
	}
}

// Core wrapping functionality
export class TextWrapper {
	public readonly settings: Required<WrapSettings>;

	constructor(settings: WrapSettings) {
		this.settings = {
			column: settings.column,
			tabWidth: settings.tabWidth ?? 4,
		};
	}

	// Simple word wrapping algorithm
	wrapLine(line: string, maxWidth: number, prefix: string = '', hangingIndent: string = ''): string[] {
		const words = line
			.trim()
			.split(/\s+/)
			.filter((w) => w.length > 0);
		if (words.length === 0) return [prefix];

		const result: string[] = [];
		let currentLine = prefix;
		let isFirstLine = true;

		for (const word of words) {
			const effectivePrefix = isFirstLine ? prefix : hangingIndent;
			const testLine =
				currentLine === effectivePrefix ? effectivePrefix + word : currentLine + ' ' + word;

			const width = strWidth(this.settings.tabWidth, testLine);

			if (width <= maxWidth || currentLine === effectivePrefix) {
				currentLine = testLine;
			} else {
				result.push(currentLine);
				currentLine = hangingIndent + word;
				isFirstLine = false;
			}
		}

		if (currentLine.trim() !== hangingIndent.trim()) {
			result.push(currentLine);
		}

		return result.length > 0 ? result : [prefix];
	}

	// Process a paragraph (group of related lines)
	wrapParagraph(lines: string[], maxWidth: number): string[] {
		// Join lines, preserving structure
		const prefix = leadingWhitespace(lines[0] || '');
		const content = lines
			.map((line) => line.replace(/^\s*/, ''))
			.join(' ')
			.trim();

		if (!content) {
			return lines.map(() => '');
		}

		// Determine hanging indent (for lists, etc.)
		let hangingIndent = prefix;
		const firstContentLine = lines.find((line) => line.trim());
		if (firstContentLine) {
			const match = firstContentLine.match(/^(\s*(?:\*|\d+\.|\-|\+)\s+)/);
			if (match) {
				hangingIndent = prefix + ' '.repeat(match[1].length);
			}
		}

		return this.wrapLine(content, maxWidth, prefix, hangingIndent);
	}

	// Main entry point for wrapping text
	wrapText(lines: string[], selections?: RewrapSelection[]): WrapResult {
		const maxWidth = this.settings.column;
		if (maxWidth < 1) return { lines: [...lines], selections: selections || [] };

		// Convert selections to line ranges
		let ranges: LineRange[] = [];
		if (selections && selections.length > 0) {
			ranges = selections.map((sel) => LineRange.fromSelection(sel));
		} else {
			// No selections means wrap everything
			ranges = [new LineRange(0, lines.length - 1)];
		}

		const result = [...lines];
		let lineOffset = 0;

		for (const range of ranges) {
			if (range.isEmpty) continue;

			const startIdx = Math.max(0, range.startLine);
			const endIdx = Math.min(lines.length - 1, range.endLine);

			// Extract the paragraph
			const paragraphLines = lines.slice(startIdx, endIdx + 1);

			// Skip if all lines are blank
			if (paragraphLines.every(isBlank)) continue;

			// Wrap the paragraph
			const wrappedLines = this.wrapParagraph(paragraphLines, maxWidth);

			// Replace in result
			result.splice(startIdx + lineOffset, endIdx - startIdx + 1, ...wrappedLines);
			lineOffset += wrappedLines.length - (endIdx - startIdx + 1);
		}

		// Adjust selections if provided
		const newSelections = selections ? this.adjustSelections(selections, result) : [];

		return {
			lines: result,
			selections: newSelections,
		};
	}

	// Adjust selections after wrapping (simplified)
	private adjustSelections(originalSelections: RewrapSelection[], newLines: string[]): RewrapSelection[] {
		// This is a simplified version - in practice you'd want more sophisticated
		// selection adjustment based on how the text was actually wrapped
		return originalSelections.map((sel) => ({
			anchor: { ...sel.anchor },
			active: { ...sel.active },
		}));
	}
}

// Auto-wrap functionality
export function maybeAutoWrap(
	inputLines: string[],
	settings: WrapSettings,
	newText: string,
	position: Position,
): Edit {
	const noEdit: Edit = { startLine: 0, endLine: 0, lines: [], selections: [] };

	if (!newText || settings.column < 1) return noEdit;
	if (newText.trim()) return noEdit; // Only wrap on whitespace

	// Check if enter was pressed
	const enterPressed = newText[0] === '\r' || newText[0] === '\n';
	const indent = enterPressed ? (newText[0] === '\r' ? newText.substring(2) : newText.substring(1)) : '';

	if (!enterPressed && newText.length > 1) return noEdit;

	const line = position.line;
	const char = position.character + (enterPressed ? 0 : newText.length);
	const lineText = inputLines[line];

	if (!lineText) return noEdit;

	const visualWidth = strWidth(settings.tabWidth ?? 4, lineText.substring(0, char));
	if (visualWidth <= settings.column) return noEdit;

	// Create wrapper and wrap the current line
	const wrapper = new TextWrapper(settings);
	const fakeSelection: RewrapSelection = {
		anchor: { line: line, character: 0 },
		active: { line: line, character: lineText.length },
	};

	const linesArray: string[] = [];
	for (let i = 0; i <= line; i++) {
		const l = inputLines[line];
		if (l !== null) linesArray.push(l);
	}

	const result = wrapper.wrapText(linesArray, [fakeSelection]);

	// Calculate new cursor position
	const afterPos: Position = enterPressed
		? { line: line + 1, character: indent.length }
		: { line: line, character: char };

	return {
		startLine: line,
		endLine: line,
		lines: result.lines.slice(line, line + 1),
		selections: [{ anchor: afterPos, active: afterPos }],
	};
}

// Main API
export function rewrap(inputLines: string[], settings: WrapSettings, selections: RewrapSelection[]): Edit {
	// Convert getLine function to work with TypeScript
	const lines: string[] = [];
	let i = 0;
	let line = inputLines[i];
	while (line !== null && line !== undefined) {
		lines.push(line);
		i++;
		line = inputLines[i];
	}

	const wrapper = new TextWrapper(settings);
	const result = wrapper.wrapText(lines, selections);

	return {
		startLine: 0,
		endLine: lines.length - 1,
		lines: result.lines,
		selections: result.selections,
	};
}

export function smartTextReWrap(text: string): string {
	// Type-safe settings
	const settings: WrapSettings = {
		column: 70,
		tabWidth: 4,
	};

	// Type-safe selection
	const selection: RewrapSelection = {
		anchor: { line: 0, character: 0 },
		active: { line: 0, character: 50 },
	};

	// const paragraphs = text.split("\n\n").map(para => para.replaceAll("\n", " "))

	// // Fully typed usage
	const paragraphs = text.split('\n\n');

	return paragraphs
		.map((para) => {
			const paraReWrapped = rewrap(para.split('\n'), settings, []);
			return paraReWrapped.lines.join('\n');
		})
		.join('\n\n');
}


// Utility function to get string width (re-export for convenience)
export { strWidth as getStringWidth };
