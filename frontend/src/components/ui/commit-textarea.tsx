import { cn } from '@/lib/utils';
import * as React from 'react';
import { useEffect } from 'react';

export interface CommitTextareaProps extends React.ComponentProps<'textarea'> {}

const CommitTextarea = React.forwardRef<HTMLTextAreaElement, CommitTextareaProps>(
	({ className, ...props }, ref) => {
		const textareaRef = React.useRef<HTMLTextAreaElement>(null);
		const rulerRef = React.useRef<HTMLDivElement>(null);

		React.useImperativeHandle(ref, () => textareaRef.current!);

		// Smart text rewrapping function
		const rewrapText = (text: string): string => {
			const lines = text.split('\n');
			const rewrappedLines: string[] = [];

			for (const line of lines) {
				if (line.trim() === '') {
					// Preserve empty lines (paragraph breaks)
					rewrappedLines.push('');
					continue;
				}

				if (line.length <= 70) {
					rewrappedLines.push(line);
					continue;
				}

				// Need to wrap this line
				const words = line.split(' ');
				let currentLine = '';

				for (const word of words) {
					if (currentLine === '') {
						currentLine = word;
					} else if ((currentLine + ' ' + word).length <= 70) {
						currentLine += ' ' + word;
					} else {
						// Current line would exceed 70 chars, start a new line
						rewrappedLines.push(currentLine);
						currentLine = word;
					}
				}

				if (currentLine !== '') {
					rewrappedLines.push(currentLine);
				}
			}

			return rewrappedLines.join('\n');
		};

		const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
			const newValue = e.target.value;

			if (props.onChange) {
				props.onChange(e);
			}
		};

		const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			// Handle Tab for auto-rewrap
			if (e.key === 't' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				const rewrapped = rewrapText(e.currentTarget.value);

				// Create a proper synthetic change event
				if (textareaRef.current && props.onChange) {
					const target = textareaRef.current;
					target.value = rewrapped;

					const syntheticEvent = {
						target,
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
				}
				return;
			}

			if (props.onKeyDown) {
				props.onKeyDown(e);
			}
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
						'disabled:opacity-50 relative z-10 whitespace-nowrap',
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
