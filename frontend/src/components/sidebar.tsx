import { SidebarItemProps, SidebarProps, useSidebarState } from '@/hooks/state/use-sidebar-state';
import clsx from 'clsx';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle, useMemo } from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type SidebarHandle = {
	addDynamicItem: (item: SidebarItemProps) => void;
	removeDynamicItem: (itemId: string) => void;
	setActiveItem: (itemId: string) => void;
	toggleMode: () => void;
	getActiveItem: () => SidebarItemProps | undefined;
	getAllItems: () => SidebarItemProps[];
};

// Custom hook for sidebar operations
function useSidebarOperations(state: ReturnType<typeof useSidebarState>, onItemClick?: (itemId: string) => void) {
	const addDynamicItem = useCallback(
		(item: SidebarItemProps): void => {
			// Check if item already exists
			const existingItems = state.dynamicItems.get();
			const itemExists = existingItems.some((existing) => existing.id === item.id);
			
			if (!itemExists) {
				const newItems = [...existingItems, { ...item, isDynamic: true }];
				state.dynamicItems.set(newItems);
			}
			
			// Set as active item
			state.activeItem.setId(item.id);
			onItemClick?.(item.id);
		},
		[state, onItemClick]
	);

	const removeDynamicItem = useCallback(
		(itemId: string): void => {
			const currentItems = state.dynamicItems.get();
			const itemToRemove = currentItems.find((item) => item.id === itemId);
			
			// Don't remove if preventClose is true
			if (itemToRemove?.preventClose) {
				return;
			}

			const newItems = currentItems.filter((item) => item.id !== itemId);
			state.dynamicItems.set(newItems);

			// If we're removing the active item, switch to the first static item
			if (state.activeItem.getId() === itemId) {
				const firstStaticItem = state.staticItems[0];
				if (firstStaticItem) {
					state.activeItem.setId(firstStaticItem.id);
					onItemClick?.(firstStaticItem.id);
				}
			}

			// Call the item's onClose callback if it exists
			itemToRemove?.onClose?.();
		},
		[state, onItemClick]
	);

	const setActiveItem = useCallback(
		(itemId: string): void => {
			const item = state.allItems.find((item) => item.id === itemId);
			if (item) {
				state.activeItem.setId(itemId);
				onItemClick?.(itemId);
			}
		},
		[state, onItemClick]
	);

	const toggleMode = useCallback((): void => {
		const currentMode = state.sidebarMode.get();
		const newMode = currentMode === 'compact' ? 'wide' : 'compact';
		state.sidebarMode.set(newMode);
	}, [state]);

	return {
		addDynamicItem,
		removeDynamicItem,
		setActiveItem,
		toggleMode,
	};
}

export const Sidebar = forwardRef<SidebarHandle, SidebarProps>((props, ref) => {
	const { sidebarSessionKey: sessionKey, staticItems, initialMode = 'wide', defaultItemId, onItemClick } = props;

	const state = useSidebarState(sessionKey, staticItems, initialMode, defaultItemId);
	const operations = useSidebarOperations(state, onItemClick);

	// Create handlers for the imperative API
	const handlers: SidebarHandle = useMemo(
		() => ({
			addDynamicItem: operations.addDynamicItem,
			removeDynamicItem: operations.removeDynamicItem,
			setActiveItem: operations.setActiveItem,
			toggleMode: operations.toggleMode,
			getActiveItem: () => state.activeItem.get(),
			getAllItems: () => state.allItems,
		}),
		[state, operations]
	);

	// Expose imperative API
	useImperativeHandle(ref, () => handlers, [handlers]);

	const isCompactMode = state.currentMode === 'compact';
	const hasDynamicItems = state.dynamicItems.get().length > 0;

	return (
		<TooltipProvider>
			<div className="h-full w-full flex">
				{/* Sidebar Navigation */}
				<div className={clsx(
					'h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200',
					isCompactMode ? 'w-12' : 'w-64'
				)}>
					{/* Header with mode toggle */}
					<div className="flex items-center justify-between p-2 border-b border-sidebar-border">
						{!isCompactMode && (
							<div className="flex-1 text-sm font-medium text-sidebar-foreground truncate">
								Navigation
							</div>
						)}
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									onClick={operations.toggleMode}
									className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
								>
									{isCompactMode ? (
										<ChevronRight className="h-4 w-4" />
									) : (
										<ChevronLeft className="h-4 w-4" />
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="right">
								{isCompactMode ? 'Expand sidebar' : 'Collapse sidebar'}
							</TooltipContent>
						</Tooltip>
					</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto">
					{/* Static items */}
					<div className="p-2">
						{state.staticItems.map((item) => (
							<SidebarMenuItem
								key={item.id}
								item={item}
								isActive={state.activeItem.getId() === item.id}
								isCompact={isCompactMode}
								onClick={operations.setActiveItem}
								onRemove={operations.removeDynamicItem}
							/>
						))}
					</div>

					{/* Separator between static and dynamic items */}
					{hasDynamicItems && (
						<div className="px-2">
							<Separator className="bg-sidebar-border" />
						</div>
					)}

					{/* Dynamic items */}
					{hasDynamicItems && (
						<div className="p-2">
							{state.dynamicItems.get().map((item) => (
								<SidebarMenuItem
									key={item.id}
									item={item}
									isActive={state.activeItem.getId() === item.id}
									isCompact={isCompactMode}
									onClick={operations.setActiveItem}
									onRemove={operations.removeDynamicItem}
								/>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Main Content Area */}
			<div className="flex-1 h-full overflow-hidden">
				{state.activeItem.get() ? (
					<div className="h-full w-full">
						{state.activeItem.get()!.component}
					</div>
				) : (
					<div className="h-full w-full flex items-center justify-center text-muted-foreground">
						No item selected
					</div>
				)}
			</div>
		</div>
		</TooltipProvider>
	);
});

Sidebar.displayName = 'Sidebar';

// Individual sidebar menu item component
interface SidebarMenuItemProps {
	item: SidebarItemProps;
	isActive: boolean;
	isCompact: boolean;
	onClick: (itemId: string) => void;
	onRemove: (itemId: string) => void;
}

const SidebarMenuItem: React.FC<SidebarMenuItemProps> = ({
	item,
	isActive,
	isCompact,
	onClick,
	onRemove,
}) => {
	const canClose = item.isDynamic && !item.preventClose;
	const showCloseButton = canClose && !isCompact;

	const handleClick = useCallback(() => {
		onClick(item.id);
	}, [onClick, item.id]);

	const handleRemove = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onRemove(item.id);
	}, [onRemove, item.id]);

	const buttonContent = (
		<button
			onClick={handleClick}
			className={clsx(
				'w-full flex items-center gap-2 p-2 rounded-md transition-all duration-200 group relative',
				'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
				{
					'bg-sidebar-accent text-sidebar-accent-foreground': isActive,
					'text-sidebar-foreground': !isActive,
					'justify-center': isCompact,
					'justify-start': !isCompact,
					'pr-8': showCloseButton, // Make room for close button
				}
			)}
		>
			{/* Icon */}
			<div className="flex-shrink-0 flex items-center justify-center h-4 w-4">
				{item.icon}
			</div>

			{/* Title (only in wide mode) */}
			{!isCompact && (
				<span className="flex-1 text-left text-sm font-medium truncate">
					{item.title}
				</span>
			)}

			{/* Close button (only for dynamic items in wide mode) */}
			{showCloseButton && (
				<button
					onClick={handleRemove}
					className={clsx(
						'absolute right-1 p-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200',
						'hover:bg-destructive/10 hover:text-destructive',
						'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
						{
							'opacity-100': isActive,
						}
					)}
					aria-label={`Close ${item.title}`}
				>
					<X className="h-3 w-3" />
				</button>
			)}
		</button>
	);

	// In compact mode, wrap with tooltip
	if (isCompact) {
		return (
			<div className="mb-1">
				<Tooltip>
					<TooltipTrigger asChild>
						{buttonContent}
					</TooltipTrigger>
					<TooltipContent side="right">
						<p>{item.title}</p>
					</TooltipContent>
				</Tooltip>
			</div>
		);
	}

	return <div className="mb-1">{buttonContent}</div>;
};