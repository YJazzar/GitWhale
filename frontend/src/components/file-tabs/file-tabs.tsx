import { TabProps, useFileTabsHandlers } from '@/hooks/state/useFileTabsHandlers';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';
import clsx from 'clsx';
import { Circle, X } from 'lucide-react';
import { useCallback } from 'react';

export type FileTabManagerProps = {
	fileTabManageSessionKey: string;
	initialTabs: TabProps[];
	defaultTabKey?: string;
};

export const FileTabs: React.FC<FileTabManagerProps> = (props) => {
	const { fileTabManageSessionKey, initialTabs, defaultTabKey } = props;

	const handlers = useFileTabsHandlers(fileTabManageSessionKey, initialTabs, defaultTabKey);

	// Handles the keyboard shortcut to close stuff
	useKeyboardShortcut('w', () => {
		let currentTab = handlers.activeTab;
		if (currentTab) {
			handlers.closeTab(currentTab);
		}
	});

	return (
		<div className="h-full w-full flex flex-col overflow-hidden">
			{/* The tabs */}
			<div className="flex-none flex flex-row bg-muted/30 border-b border-border overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
				{handlers.openTabs.map((file, index) => {
					return (
						<FileTabHeader
							key={file.tabKey}
							file={file}
							handlers={handlers}
							isFirst={index === 0}
						/>
					);
				})}
				{/* Add some space at the end for better UX when scrolling */}
				<div className="w-4 flex-shrink-0" />
			</div>

			{/* The tab contents - direct component rendering */}
			<div className="flex-1 overflow-hidden relative">
				{handlers.openTabs.map((tab) => {
					const isActive = tab.tabKey === handlers.activeTabKey;

					return (
						<div
							key={tab.tabKey}
							className={clsx('absolute inset-0', {
								'opacity-100 z-10': isActive,
								'opacity-0 z-0 pointer-events-none': !isActive,
							})}
							style={{
								visibility: isActive ? 'visible' : 'hidden',
							}}
						>
							<div className="w-full h-full overflow-auto">{tab.component}</div>
						</div>
					);
				})}

				{/* Show empty state if no tabs */}
				{handlers.openTabs.length === 0 && (
					<div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
						No tabs open
					</div>
				)}
			</div>
		</div>
	);
};

type FileTabHeaderProps = {
	file: TabProps;
	handlers: ReturnType<typeof useFileTabsHandlers>;
	isFirst?: boolean;
};

const FileTabHeader: React.FunctionComponent<FileTabHeaderProps> = (props) => {
	const { file, handlers, isFirst = false } = props;

	const isTemporarilyOpen = !file.isPermanentlyOpen && !file.preventUserClose;
	const isCurrentFileOpen = handlers.getActiveTab()?.tabKey === file.tabKey;

	const onCloseClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
		event.preventDefault();
		event.stopPropagation();
		handlers.closeTab(file);
	};

	const onOpenFileClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
		if (isCurrentFileOpen && isTemporarilyOpen) {
			handlers.setTabPermaOpen(file);
			return;
		}

		handlers.openTab(file);
	};

	const onDoubleClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
		handlers.setTabPermaOpen(file);
	};

	return (
		<div className="relative group">
			<div
				key={file.tabKey}
				className={clsx([
					'group relative flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-all duration-200 border-r border-border/50 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-w-0 max-w-48 cursor-pointer',
					{
						'bg-background border-t-2 border-t-primary text-foreground shadow-sm':
							isCurrentFileOpen,
						'bg-muted/20 text-muted-foreground hover:text-foreground': !isCurrentFileOpen,
						'pr-8': !file.preventUserClose, // Make room for close button
						'pr-3': file.preventUserClose,
						'border-l border-l-border/30': !isFirst, // Add left border except for first tab
					},
				])}
				onDoubleClick={onDoubleClick}
				onClick={onOpenFileClick}
			>
				{/* File name */}
				<span
					className={clsx('truncate', {
						italic: isTemporarilyOpen,
					})}
					title={typeof file.titleRender() === 'string' ? String(file.titleRender()) : ''}
				>
					{file.titleRender()}
				</span>

				{/* Temporary indicator */}
				{isTemporarilyOpen && (
					<Circle className="h-2 w-2 fill-current text-muted-foreground/60 flex-shrink-0" />
				)}
			</div>

			{/* Close button */}
			{!file.preventUserClose && (
				<button
					onClick={onCloseClick}
					className={clsx([
						'absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
						{
							'opacity-100': isCurrentFileOpen,
							'hover:bg-muted': !isCurrentFileOpen,
						},
					])}
					aria-label={`Close ${
						typeof file.titleRender() === 'string' ? String(file.titleRender()) : 'file'
					}`}
				>
					<X className="h-3.5 w-3.5" />
				</button>
			)}
		</div>
	);
};