import { SidebarItemProps, useSidebarHandlers } from '@/hooks/state/useSidebarHandlers';
import clsx from 'clsx';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback } from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';
import { ReactNode } from 'react';

export type SidebarProps = {
	sidebarSessionKey: string;
	staticItems: SidebarItemProps[];
	initialMode: 'compact' | 'wide';
	defaultItemId?: string;
};

export const Sidebar: React.FC<SidebarProps> = (props) => {
	const { sidebarSessionKey: sessionKey, staticItems, initialMode, defaultItemId } = props;

	const handlers = useSidebarHandlers(sessionKey, { staticItems, initialMode, defaultItemId });

	useKeyboardShortcut('b', () => {
		handlers.toggleMode();
	});

	// For some reason, uncommenting this breaks the File-tabs ctrl+w listener
	// useKeyboardShortcut( "w", (event) => {
	// 	let activeItem = state.activeItem.get()
	// 	if (!!activeItem && activeItem.isDynamic == true) {
	// 		event.preventDefault()
	// 		event.stopPropagation()

	// 		operations.removeDynamicItem(activeItem.id)
	// 	}
	// })
	const isCompactMode = handlers.currentMode === 'compact';
	const hasDynamicItems = (handlers.dynamicItems?.length ?? 0) > 0;

	return (
		<TooltipProvider>
			<div className="h-full w-full flex">
				{/* Sidebar Navigation */}
				<div
					className={clsx(
						'h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200',
						isCompactMode ? 'w-12' : 'w-64'
					)}
				>
					{/* Header with mode toggle */}
					<div className="flex items-center justify-between p-2 border-b border-sidebar-border">
						{!isCompactMode && (
							<div className="flex-1 text-sm font-medium text-sidebar-foreground truncate select-none">
								Navigation
							</div>
						)}
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									onClick={handlers.toggleMode}
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
							{handlers.staticItems?.map((item) => (
								<SidebarMenuItem
									key={item.id}
									item={item}
									isActive={handlers.activeItemId === item.id}
									isCompact={isCompactMode}
									onClick={handlers.setActiveItem}
									onRemove={handlers.removeDynamicItem}
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
								{handlers.dynamicItems?.map((item) => (
									<SidebarMenuItem
										key={item.id}
										item={item}
										isActive={handlers.activeItemId === item.id}
										isCompact={isCompactMode}
										onClick={handlers.setActiveItem}
										onRemove={handlers.removeDynamicItem}
									/>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Main Content Area */}
				<div className="flex-1 h-full overflow-hidden">
					{handlers.activeItem ? (
						<div className="h-full w-full">{handlers.activeItem.component}</div>
					) : (
						<div className="h-full w-full flex items-center justify-center text-muted-foreground">
							No item selected
						</div>
					)}
				</div>
			</div>
		</TooltipProvider>
	);
};

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

	const handleRemove = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			onRemove(item.id);
		},
		[onRemove, item.id]
	);

	const buttonContent = (
		<button
			onClick={handleClick}
			className={clsx(
				'w-full flex items-center gap-2 p-2 rounded-md transition-all duration-200 group relative select-none',
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
			<div className="flex-shrink-0 flex items-center justify-center h-4 w-4">{item.icon}</div>

			{/* Title (only in wide mode) */}
			{!isCompact && (
				<span className="flex-1 text-left text-sm font-medium truncate">{item.title}</span>
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
					<TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
					<TooltipContent side="right">
						<p>{item.title}</p>
					</TooltipContent>
				</Tooltip>
			</div>
		);
	}

	return <div className="mb-1">{buttonContent}</div>;
};
