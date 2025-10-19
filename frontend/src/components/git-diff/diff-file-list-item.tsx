import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const statusColorMap: Record<string, string> = {
	M: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
	A: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
	D: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
	R: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
	C: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
	'?': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export interface DiffStatusBadgeProps {
	status?: string;
	className?: string;
}

export function DiffStatusBadge({ status, className }: DiffStatusBadgeProps) {
	const normalizedStatus = status && status.trim() ? status.trim() : '?';
	const statusStyles = statusColorMap[normalizedStatus] || statusColorMap['?'];

	return (
		<span className={cn('text-xs font-mono rounded px-1 py-0 font-medium', statusStyles, className)}>
			{normalizedStatus}
		</span>
	);
}

export interface DiffFileListItemProps extends HTMLAttributes<HTMLDivElement> {
	status?: string;
	statusBadge?: ReactNode;
	leadingIcon?: ReactNode;
	primaryText: ReactNode;
	secondaryText?: ReactNode;
	tertiaryText?: ReactNode;
	actionSlot?: ReactNode;
	isActive?: boolean;
	activeClassName?: string;
	disableHover?: boolean;
}

export function DiffFileListItem(props: DiffFileListItemProps) {
	const {
		status,
		statusBadge,
		leadingIcon,
		primaryText,
		secondaryText,
		tertiaryText,
		actionSlot,
		isActive,
		activeClassName,
		disableHover,
		className,
		tabIndex,
		onClick,
		...rest
	} = props;

	const statusNode = statusBadge ?? (status ? <DiffStatusBadge status={status} /> : null);

	const itemClasses = cn(
		'group flex items-center gap-1.5 py-1 px-1 rounded border border-transparent transition-colors',
		disableHover ? 'cursor-default' : 'hover:bg-accent/60 hover:border-border/40 cursor-pointer',
		isActive && cn('border-border/60', activeClassName || 'bg-accent/70'),
		className
	);

	const focusableTabIndex = tabIndex ?? (onClick ? 0 : undefined);

	return (
		<div
			className={itemClasses}
			onClick={onClick}
			tabIndex={focusableTabIndex}
			role={onClick ? 'button' : rest.role}
			{...rest}
		>
			{statusNode}

			{leadingIcon}

			<div className="flex-1 min-w-0 flex items-center gap-1.5">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-1.5 min-w-0">
						<span className="text-sm font-medium truncate">{primaryText}</span>
						{secondaryText && (
							<span className="text-xs text-muted-foreground/70 truncate">{secondaryText}</span>
						)}
					</div>
					{tertiaryText && <div className="text-xs text-muted-foreground/60">{tertiaryText}</div>}
				</div>
			</div>

			{actionSlot}
		</div>
	);
}
