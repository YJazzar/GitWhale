import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import type { ContextMenuAction } from '@/hooks/use-context-menu';

interface ContextMenuProviderProps<T> {
	isOpen: boolean;
	position: { x: number; y: number };
	contextData: T;
	actions: ContextMenuAction<T>[];
	onClose: () => void;
	className?: string;
}

export function ContextMenuProvider<T = any>({
	isOpen,
	position,
	contextData,
	actions,
	onClose,
	className,
}: ContextMenuProviderProps<T>) {
	const menuRef = useRef<HTMLDivElement>(null);

	// Handle click outside and escape key
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				onClose();
			}
		};

		const handleEscapeKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		// Add listeners after a short delay to prevent immediate closure
		const timeoutId = setTimeout(() => {
			document.addEventListener('mousedown', handleClickOutside);
			document.addEventListener('keydown', handleEscapeKey);
		}, 10);

		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleEscapeKey);
		};
	}, [isOpen, onClose]);

	// Handle action clicks
	const handleActionClick = (action: ContextMenuAction<T>) => {
		if (action.disabled && action.disabled(contextData)) {
			return;
		}
		
		action.onClick(contextData);
		onClose();
	};

	if (!isOpen) {
		return null;
	}

	const menuContent = (
		<div
			ref={menuRef}
			className={cn(
				'fixed z-50 min-w-48 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
				'animate-in fade-in-0 zoom-in-95 duration-200',
				className
			)}
			style={{
				left: `${position.x}px`,
				top: `${position.y}px`,
			}}
		>
			{actions.map((action, index) => (
				<div key={action.id}>
					{action.separator && index > 0 && (
						<div className="my-1 h-px bg-border" />
					)}
					<button
						className={cn(
							'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors',
							'hover:bg-accent hover:text-accent-foreground',
							'focus:bg-accent focus:text-accent-foreground',
							'disabled:pointer-events-none disabled:opacity-50'
						)}
						onClick={() => handleActionClick(action)}
						disabled={action.disabled ? action.disabled(contextData) : false}
					>
						{action.icon && (
							<action.icon className="mr-2 h-4 w-4" />
						)}
						<span>{action.label}</span>
					</button>
				</div>
			))}
		</div>
	);

	// Render using portal to ensure proper positioning
	return createPortal(menuContent, document.body);
}