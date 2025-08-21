import { UseAppState } from '@/hooks/state/use-app-state';
import { cn } from '@/lib/utils';
import { smartTextReWrap } from '@/utils/textwrapper';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export interface CommitTextareaProps extends React.ComponentProps<'textarea'> {}

const CommitTextarea = forwardRef<HTMLTextAreaElement, CommitTextareaProps>(
	({ className, ...props }, ref) => {
		const { appState } = UseAppState();
		const textareaRef = useRef<HTMLTextAreaElement>(null);
		const rulerRef = useRef<HTMLDivElement>(null);
		const [selectionStart, setSelectionStart] = useState<number | undefined>(undefined);

		const wrapLimit = appState?.appConfig?.settings.git.commitMessageWrapLimitCol || 70;
		const tabWidth = appState?.appConfig?.settings.git.commitMessageTabWidth || 4;

		useImperativeHandle(ref, () => textareaRef.current!);

		useEffect(() => {
			if (!selectionStart) {
				return;
			}

			const textarea = textareaRef.current;
			if (textarea) {
				textarea.selectionStart = selectionStart;
				textarea.selectionEnd = selectionStart;
			}
			setSelectionStart(undefined);
		}, [selectionStart, setSelectionStart]);

		const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
			// Reset height to auto to get the correct scrollHeight
			textarea.style.height = 'auto';
			
			// If textarea is empty, set to single line height
			if (!textarea.value.includes('\n')) {
				// Calculate single line height based on font size and line height
				const computedStyle = getComputedStyle(textarea);
				const fontSize = parseFloat(computedStyle.fontSize);
				const lineHeight = computedStyle.lineHeight === 'normal' ? fontSize * 1.2 : parseFloat(computedStyle.lineHeight);
				const paddingTop = parseFloat(computedStyle.paddingTop);
				const paddingBottom = parseFloat(computedStyle.paddingBottom);
				const singleLineHeight = lineHeight + paddingTop + paddingBottom;
				textarea.style.height = `${singleLineHeight}px`;
			} else {
				// Set height to scrollHeight to fit content
				const newHeight = Math.max(0, Math.min(textarea.scrollHeight, 250))
				textarea.style.height = `${newHeight}px`;
			}
		};

		// Auto-resize when component mounts or value changes
		useEffect(() => {
			if (textareaRef.current) {
				adjustTextareaHeight(textareaRef.current);
			}
		}, [props.value]);

		const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
			// Auto-resize the textarea for browsers that don't support field-sizing-content
			adjustTextareaHeight(e.target);
			
			if (props.onChange) {
				props.onChange(e);
			}
		};

		const createSyntheticChangeEvent = (newValue: string, newSelectionStart?: number) => {
			// Create a proper synthetic change event
			if (!textareaRef.current || !props.onChange) {
				return;
			}

			const target = textareaRef.current;
			const syntheticEvent = {
				target: {
					value: newValue,
				},
				currentTarget: target,
				type: 'change',
				bubbles: true,
				cancelable: true,
				nativeEvent: new Event('change'),
				isDefaultPrevented: () => false,
				isPropagationStopped: () => false,
				persist: () => {},
				preventDefault: () => {},
				stopPropagation: () => {},
			} as React.ChangeEvent<HTMLTextAreaElement>;

			props.onChange(syntheticEvent);

			if (newSelectionStart) {
				setSelectionStart(newSelectionStart);
			}
		};

		const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			// Handle Tab for auto-rewrap
			if (e.key === 't' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				const rewrappedText = smartTextReWrap(e.currentTarget.value, wrapLimit, tabWidth);
				createSyntheticChangeEvent(rewrappedText);
				return;
			}

			// Handle Tab for auto-rewrap
			if (e.key === 'Tab' && textareaRef.current) {
				e.preventDefault();
				e.preventDefault(); // Prevent default tab behavior

				var start = textareaRef.current?.selectionStart;
				var end = textareaRef.current?.selectionEnd;

				// Insert tab character
				const currentContents = textareaRef.current?.value ?? '';
				const tabContents = getRepeatedChars(' ', tabWidth)
				const newTextareaContents = `${currentContents.substring(0, start)}${tabContents}${currentContents.substring(end ?? 0)}`
				createSyntheticChangeEvent(newTextareaContents, start + 1);

				// Reposition cursor
				textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1;
				return;
			}

			props?.onKeyDown?.(e);
		};

		// Calculate ruler position based on character width
		useEffect(() => {
			if (textareaRef.current && rulerRef.current) {
				const textarea = textareaRef.current;
				const ruler = rulerRef.current;

				// Create a temporary span to measure character width
				const measureSpan = document.createElement('span');
				measureSpan.style.visibility = 'hidden';
				measureSpan.style.position = 'absolute';
				measureSpan.style.whiteSpace = 'nowrap';
				measureSpan.style.fontFamily =
					'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
				measureSpan.style.fontSize = getComputedStyle(textarea).fontSize;
				measureSpan.textContent = getRepeatedChars('M', wrapLimit);

				document.body.appendChild(measureSpan);
				const charWidth = measureSpan.offsetWidth;
				document.body.removeChild(measureSpan);

				// Calculate position for 70th character
				const paddingLeft = parseInt(getComputedStyle(textarea).paddingLeft, 10);
				const rulerPosition = paddingLeft + charWidth;

				ruler.style.left = `${rulerPosition}px`;
			}
		}, []);

		return (
			<div className="relative overflow-hidden rounded-md">
				<textarea
					ref={textareaRef}
					className={cn(
						'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs transition-colors',
						'placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed',
						'disabled:opacity-50 relative z-10 whitespace-pre field-sizing-content resize-none',
						'font-mono', // Monospace font
						className
					)}
					value={props.value}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					{...props}
				/>

				{/* Visual ruler at 70th character - positioned behind textarea */}
				<div
					ref={rulerRef}
					className="absolute top-0 bottom-0 w-px bg-muted-foreground/30 pointer-events-none z-0"
					style={{ left: '0px' }}
				/>
			</div>
		);
	}
);

CommitTextarea.displayName = 'CommitTextarea';

const getRepeatedChars = (char: string, repeating: number) => {
	let result = '';
	for (let i = 0; i < repeating; i++) {
		result += char;
	}
	return result;
};

export { CommitTextarea };
