import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trash2, ChevronDown } from 'lucide-react';

interface ConfirmDeleteButtonProps {
	onDelete: () => void | Promise<void>;
	disabled?: boolean;
	size?: 'default' | 'sm' | 'lg' | 'icon';
	className?: string;
	children?: React.ReactNode;
}

export const ConfirmDeleteButton = React.forwardRef<HTMLButtonElement, ConfirmDeleteButtonProps>(
	({ onDelete, disabled, size = 'default', className, children }, ref) => {
		const [isOpen, setIsOpen] = React.useState(false);

		const handleConfirmDelete = React.useCallback(async () => {
			setIsOpen(false);
			await onDelete();
		}, [onDelete]);

		return (
			<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenuTrigger asChild>
					<Button
						ref={ref}
						variant="destructive"
						size={size}
						disabled={disabled}
						className={`select-none ${className || ''}`}
					>
						{children || (
							<>
								<Trash2 className="h-4 w-4 mr-2" />
								Delete
							</>
						)}
						{size !== 'sm' && <ChevronDown className="h-3 w-3 ml-1" />}
						{size === 'sm' && children && <ChevronDown className="h-2 w-2 ml-0.5" />}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-48">
					<DropdownMenuItem
						onClick={handleConfirmDelete}
						className="text-destructive focus:text-destructive focus:bg-destructive/10"
					>
						<Trash2 className="h-4 w-4 mr-2" />
						Confirm Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}
);

ConfirmDeleteButton.displayName = 'ConfirmDeleteButton';