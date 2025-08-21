import { cn } from '@/lib/utils';
import { smartTextReWrap } from '@/utils/textwrapper';
import * as React from 'react';
import { useEffect, useImperativeHandle, useState } from 'react';

export interface CommitTextareaProps extends React.ComponentProps<'textarea'> {}

const CommitTextarea = React.forwardRef<HTMLTextAreaElement, CommitTextareaProps>(
	({ className, ...props }, ref) => {
		const textareaRef = React.useRef<HTMLTextAreaElement>(null);
		const rulerRef = React.useRef<HTMLDivElement>(null);
		const [selectionStart, setSelectionStart] = useState<number | undefined>(undefined);

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

		const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
			const newValue = e.target.value;

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
				const rewrappedText = smartTextReWrap(e.currentTarget.value);
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
				const newTextareaContents =
					currentContents.substring(0, start) + '\t' + currentContents.substring(end ?? 0);
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
				const getRepeatedChars = (char: string, repeating: number) => {
					let result = '';
					for (let i = 0; i < repeating; i++) {
						result += char;
					}
					return result;
				};

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
				measureSpan.textContent = getRepeatedChars('M', 70);

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
						'flex min-h-[80px] h-full w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm transition-colors',
						'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed',
						'disabled:opacity-50 relative z-10 whitespace-pre-wrap',
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

export { CommitTextarea };
