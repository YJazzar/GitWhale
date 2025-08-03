import clsx from 'clsx';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Link, To, useLocation, useNavigate, useParams } from 'react-router';
import { X, FileText, Circle } from 'lucide-react';

export type FileTabsHandle = {
	closeFile: (fileToClose: FileTabPageProps) => void;
	openFile: (fileToOpen: FileTabPageProps) => void;
	getOpenFile: () => FileTabPageProps | undefined;
	getFileProps: (fileKey: string) => FileTabPageProps | undefined;
	setFilePermaOpen: (file: FileTabPageProps) => void;
};

export type FileTabsProps = {
	// Which route to go to when there are no tabs open
	noTabSelectedPath: To;

	// Which page to open on the first render
	defaultTabKey: string;

	// What are all the possible options open as tabs on the first render
	initialPages: FileTabPageProps[];

	// The router config to make sure the child components can be linked to properly
	routerConfig: () => JSX.Element;
};

export type FileTabPageProps = {
	// The path to route to when the tab is clicked
	linkPath: To;

	// A uniquely identifiable key for the page
	tabKey: string;

	// Renders the title of the tab, most of the time should just be a string (+ maybe an icon)
	titleRender: () => JSX.Element;

	// Controls if the "x" button shows up
	preventUserClose?: boolean | undefined;

	// Controls if the file is only temporarily open or not
	isPermanentlyOpen?: boolean;

	// Code hook to run additional logic when the tab is closed
	onTabClose?: () => void;
};

// Custom hook for file management logic
function useFileTabsState(initialPages: FileTabPageProps[], defaultTabKey: string) {
	const [activeTabKey, setActiveTabKey] = useState<string | undefined>(defaultTabKey);
	const [availableFiles, setAvailableFiles] = useState<FileTabPageProps[]>(initialPages);

	// Convert the availablePages into a map for easy lookup
	const availableFileMap = useMemo(() => {
		const map: Map<string, FileTabPageProps> = new Map();
		availableFiles.forEach((page) => {
			map.set(page.tabKey, page);
		});
		return map;
	}, [availableFiles]);

	const getOpenFile = useCallback((): FileTabPageProps | undefined => {
		if (activeTabKey) {
			return availableFileMap.get(activeTabKey);
		}
	}, [activeTabKey, availableFileMap]);

	const getFileProps = useCallback((fileKey: string): FileTabPageProps | undefined => {
		return availableFileMap.get(fileKey);
	}, [availableFileMap]);

	return {
		activeTabKey,
		setActiveTabKey,
		availableFiles,
		setAvailableFiles,
		availableFileMap,
		getOpenFile,
		getFileProps,
	};
}

// Custom hook for file operations
function useFileTabsOperations(
	fileState: ReturnType<typeof useFileTabsState>,
	navigate: (to: To) => void,
	noTabSelectedPath: To
) {
	const { activeTabKey, availableFiles, setAvailableFiles, setActiveTabKey, availableFileMap } = fileState;

	const navigateToFile = useCallback((file: FileTabPageProps | undefined) => {
		setActiveTabKey(file?.tabKey);

		if (!file?.linkPath) {
			console.log('navigating to parent path');
			navigate(noTabSelectedPath);
		} else {
			console.log('navigating to new path: ', file);
			navigate(file.linkPath);
		}
	}, [navigate, noTabSelectedPath, setActiveTabKey]);

	const closeFile = useCallback((fileToClose: FileTabPageProps): void => {
		let prevActiveIndex = availableFiles.findIndex((file) => file.tabKey === activeTabKey);
		if (fileToClose.tabKey === activeTabKey) {
			prevActiveIndex += 1;
		}

		const newAvailableTabs = availableFiles.filter((openFile) => {
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
			navigateToFile(newAvailableTabs[prevActiveIndex]);
		} else {
			navigateToFile(undefined);
		}
		setAvailableFiles([...newAvailableTabs]);

		const actuallyClosingFile = newAvailableTabs.length !== availableFiles.length;
		if (actuallyClosingFile) {
			fileToClose.onTabClose?.();
		}
	}, [availableFiles, activeTabKey, navigateToFile, setAvailableFiles]);

	const openFile = useCallback((newPage: FileTabPageProps): void => {
		// If the page is already open in a different tab
		if (!!availableFileMap.get(newPage.tabKey)) {
			navigateToFile(newPage);
			return;
		}

		//  Filter out any non-permanently open files
		const newAvailableTabs = availableFiles.filter((openFile) => {
			return openFile.isPermanentlyOpen || openFile.preventUserClose;
		});

		setAvailableFiles([...newAvailableTabs, newPage]);
		navigateToFile(newPage);
	}, [availableFiles, availableFileMap, navigateToFile, setAvailableFiles]);

	const setFilePermaOpen = useCallback((fileToKeepOpen: FileTabPageProps): void => {
		let newAvailableTabs = availableFiles.map((file) => {
			if (file.tabKey === fileToKeepOpen.tabKey) {
				file.isPermanentlyOpen = true;
			}
			return file;
		});
		setAvailableFiles(newAvailableTabs);
	}, [availableFiles, setAvailableFiles]);

	return {
		closeFile,
		openFile,
		setFilePermaOpen,
		navigateToFile,
	};
}

export const FileTabs = forwardRef<FileTabsHandle, FileTabsProps>((props, ref) => {
	const { defaultTabKey, initialPages, routerConfig, noTabSelectedPath } = props;

	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		console.debug('Location changed to: ', location);
	}, [location]);

	// Use our custom hooks for better separation of concerns
	const fileState = useFileTabsState(initialPages, defaultTabKey);
	const operations = useFileTabsOperations(fileState, navigate, noTabSelectedPath);

	// Create handlers for the imperative API
	const handlers: FileTabsHandle = useMemo(() => ({
		closeFile: operations.closeFile,
		openFile: operations.openFile,
		getOpenFile: fileState.getOpenFile,
		getFileProps: fileState.getFileProps,
		setFilePermaOpen: operations.setFilePermaOpen,
	}), [operations.closeFile, operations.openFile, operations.setFilePermaOpen, fileState.getOpenFile, fileState.getFileProps]);

	// Hooks that can be called by the parent component
	useImperativeHandle(ref, () => handlers, [handlers]);

	// Handles the keyboard shortcut to close stuff
	// Stable handlers prevent unnecessary re-renders and event listener changes
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === 'w') {
				event.preventDefault();
				event.stopPropagation();

				let currentFile = fileState.getOpenFile();
				if (currentFile) {
					operations.closeFile(currentFile);
				}
			}
		};

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [fileState.getOpenFile, operations.closeFile]);

	return (
		<div className="h-full w-full flex flex-col">
			{/* The tabs */}
			<div className="h-fit flex flex-row bg-muted/30 border-b border-border overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
				{fileState.availableFiles.map((file, index) => {
					return <FileTabHeader key={file.tabKey} file={file} handlers={handlers} isFirst={index === 0} />;
				})}
				{/* Add some space at the end for better UX when scrolling */}
				<div className="w-4 flex-shrink-0" />
			</div>

			{/* The tab contents */}
			<div className="grow h-full max-h-full max-w-full w-full overflow-auto">{routerConfig()}</div>
		</div>
	);
});

type FileTabHeaderProps = {
	file: FileTabPageProps;
	handlers: FileTabsHandle;
	isFirst?: boolean;
};

const FileTabHeader: React.FunctionComponent<FileTabHeaderProps> = (props) => {
	const { file, handlers, isFirst = false } = props;

	const isTemporarilyOpen = !file.isPermanentlyOpen && !file.preventUserClose;
	const isCurrentFileOpen = handlers.getOpenFile()?.tabKey === file.tabKey;

	const onCloseClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
		event.preventDefault();
		event.stopPropagation();
		handlers.closeFile(file);
	};

	const onOpenFileClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
		if (isCurrentFileOpen && isTemporarilyOpen) {
			handlers.setFilePermaOpen(file);
			return;
		}

		handlers.openFile(file);
	};

	const onDoubleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
		handlers.setFilePermaOpen(file);
	};

	return (
		<div className="relative group">
			<Link
				key={file.tabKey}
				to={file.linkPath}
				className={clsx([
					'group relative flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-all duration-200 border-r border-border/50 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-w-0 max-w-48',
					{
						'bg-background border-t-2 border-t-primary text-foreground shadow-sm': isCurrentFileOpen,
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
						'italic': isTemporarilyOpen,
					})}
					title={typeof file.titleRender() === 'string' ? String(file.titleRender()) : ''}
				>
					{file.titleRender()}
				</span>

				{/* Temporary indicator */}
				{isTemporarilyOpen && (
					<Circle className="h-2 w-2 fill-current text-muted-foreground/60 flex-shrink-0" />
				)}
			</Link>

			{/* Close button */}
			{!file.preventUserClose && (
				<button
					onClick={onCloseClick}
					className={clsx([
						'absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
						{
							'opacity-100': isCurrentFileOpen,
							'hover:bg-muted': !isCurrentFileOpen,
						}
					])}
					aria-label={`Close ${typeof file.titleRender() === 'string' ? String(file.titleRender()) : 'file'}`}
				>
					<X className="h-3.5 w-3.5" />
				</button>
			)}
		</div>
	);
};
