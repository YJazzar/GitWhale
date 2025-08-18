import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
	value: string[];
	onChange: (tags: string[]) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

export const TagInput = React.forwardRef<HTMLInputElement, TagInputProps>(
	({ value, onChange, placeholder, className, disabled }, ref) => {
		const [inputValue, setInputValue] = React.useState('');

		const addTag = React.useCallback((tag: string) => {
			const trimmedTag = tag.trim();
			if (trimmedTag && !value.includes(trimmedTag)) {
				onChange([...value, trimmedTag]);
			}
			setInputValue('');
		}, [value, onChange]);

		const removeTag = React.useCallback((tagToRemove: string) => {
			onChange(value.filter(tag => tag !== tagToRemove));
		}, [value, onChange]);

		const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				addTag(inputValue);
			} else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
				// Remove last tag if input is empty and user presses backspace
				removeTag(value[value.length - 1]);
			}
		}, [inputValue, addTag, removeTag, value]);

		const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
			setInputValue(e.target.value);
		}, []);

		const handleInputBlur = React.useCallback(() => {
			// Add tag on blur if there's content
			if (inputValue.trim()) {
				addTag(inputValue);
			}
		}, [inputValue, addTag]);

		return (
			<div className={cn('flex flex-col gap-2', className)}>
				{/* Tags display */}
				{value.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{value.map((tag) => (
							<Badge
								key={tag}
								variant="secondary"
								className="select-none flex items-center gap-1 pr-1"
							>
								<span>{tag}</span>
								{!disabled && (
									<button
										type="button"
										onClick={() => removeTag(tag)}
										className="hover:bg-muted rounded-full p-0.5 transition-colors"
									>
										<X className="h-3 w-3" />
									</button>
								)}
							</Badge>
						))}
					</div>
				)}
				
				{/* Input field */}
				<Input
					ref={ref}
					value={inputValue}
					onChange={handleInputChange}
					onKeyDown={handleKeyDown}
					onBlur={handleInputBlur}
					placeholder={value.length === 0 ? placeholder : 'Add another...'}
					disabled={disabled}
				/>
				
				{/* Helper text */}
				<div className="text-xs text-muted-foreground">
					Press Enter to add a tag, Backspace to remove the last tag
				</div>
			</div>
		);
	}
);

TagInput.displayName = 'TagInput';