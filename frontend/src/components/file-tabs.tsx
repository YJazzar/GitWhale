import { FileTabManagerProps, TabProps, useFileManagerState } from '@/hooks/state/use-file-manager-state';
import clsx from 'clsx';
import { Circle, X } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

export type TabsManagerHandle = {
	closeTab: (tabToClose: TabProps) => void;
	openTab: (tabToOpen: TabProps) => void;
	getActiveTab: () => TabProps | undefined;
	getTabProps: (tabKey: string) => TabProps | undefined;
	setTabPermaOpen: (tab: TabProps) => void;
};

// Custom hook for file operations
function useFileTabsOperations(state: ReturnType<typeof useFileManagerState>) {
	const closeFile = useCallback(
		(fileToClose: TabProps): void => {
			const activeTabKey = state.activeTabKey.get();

			let prevActiveIndex = state.openTabs.get().findIndex((file) => file.tabKey === activeTabKey);
			if (fileToClose.tabKey === activeTabKey) {
				prevActiveIndex += 1;
			}

			const newAvailableTabs = state.openTabs.get().filter((openFile) => {
				if (openFile.preventUserClose) {
					return true; // don't close things the user isn't allowed to close
				}
				if (openFile.tabKey === fileToClose.tabKey) {
					return false; // close the tab
				}
				return true;
			});

			// Update state
			prevActiveIndex %= newAvailableTabs.length;
			if (prevActiveIndex < newAvailableTabs.length) {
				state.activeTabKey.set(newAvailableTabs[prevActiveIndex]?.tabKey);
			} else {
				state.activeTabKey.set(undefined);
			}
			state.openTabs.set([...newAvailableTabs]);

			const actuallyClosingFile = newAvailableTabs.length !== state.openTabs.get().length;
			if (actuallyClosingFile) {
				fileToClose.onTabClose?.();
			}
		},
		[state]
	);

	const openFile = useCallback(
		(newPage: TabProps): void => {
			// If the page is already open in a different tab
			if (!!state.openTabs.get().some((tab) => tab.tabKey === newPage.tabKey)) {
				state.activeTabKey.set(newPage.tabKey);
				return;
			}

			//  Filter out any non-permanently open files
			const newAvailableTabs = state.openTabs.get().filter((openFile) => {
				return openFile.isPermanentlyOpen || openFile.preventUserClose;
			});

			state.openTabs.set([...newAvailableTabs, newPage]);
			state.activeTabKey.set(newPage.tabKey);
		},
		[state]
	);

	const setFilePermaOpen = useCallback(
		(fileToKeepOpen: TabProps): void => {
			let newAvailableTabs = state.openTabs.get().map((file) => {
				if (file.tabKey === fileToKeepOpen.tabKey) {
					file.isPermanentlyOpen = true;
				}
				return file;
			});
			state.openTabs.set(newAvailableTabs);
		},
		[state]
	);

	return {
		closeFile,
		openFile,
		setFilePermaOpen,
	};
}

export const FileTabs = forwardRef<TabsManagerHandle, FileTabManagerProps>((props, ref) => {
	const { fileTabManageSessionKey, initialTabs, defaultTabKey } = props;

	const state = useFileManagerState(fileTabManageSessionKey, initialTabs, defaultTabKey);
	const operations = useFileTabsOperations(state);

	// Create handlers for the imperative API
	const handlers: TabsManagerHandle = useMemo(
		() => ({
			closeTab: operations.closeFile,
			openTab: operations.openFile,
			getActiveTab: () => state.activeTab,
			getTabProps: (tabKey: string) => state.openTabs.get().find((tab) => tab.tabKey === tabKey),
			setTabPermaOpen: operations.setFilePermaOpen,
		}),
		[state, operations]
	);

	// Hooks that can be called by the parent component
	useImperativeHandle(ref, () => handlers, [handlers]);

	// Handles the keyboard shortcut to close stuff
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === 'w') {
				event.preventDefault();
				event.stopPropagation();

				let currentTab = state.activeTab;
				if (currentTab) {
					operations.closeFile(currentTab);
				}
			}
		};

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [state, operations]);

	return (
		<div className="h-full w-full flex flex-col">
			{/* The tabs */}
			<div className="h-fit flex flex-row bg-muted/30 border-b border-border overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
				{state.openTabs.get().map((file, index) => {
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
			<div className="grow h-full max-h-full max-w-full w-full relative overflow-hidden">
				{state.openTabs.get().map((tab) => {
					const isActive = tab.tabKey === state.activeTabKey.get();

					return (
						<div
							key={tab.tabKey}
							className={clsx('absolute inset-0 h-full w-full overflow-auto', {
								hidden: !isActive,
								block: isActive,
							})}
							style={{ display: isActive ? 'block' : 'none' }}
						>
							{tab.component}
						</div>
					);
				})}

				{/* Show empty state if no tabs */}
				{state.openTabs.get().length === 0 && (
					<div className="h-full w-full flex items-center justify-center text-muted-foreground">
						No tabs open
					</div>
				)}
			</div>
		</div>
	);
});

type FileTabHeaderProps = {
	file: TabProps;
	handlers: TabsManagerHandle;
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
