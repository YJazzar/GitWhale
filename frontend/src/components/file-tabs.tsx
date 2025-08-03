import clsx from 'clsx';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Link, To, useLocation, useNavigate, useParams } from 'react-router';

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
		console.log('Location changed to: ' + JSON.stringify(location));
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
			<div className="h-fit flex flex-row border-b-2 text-sm">
				{fileState.availableFiles.map((file) => {
					return <FileTabHeader key={file.tabKey} file={file} handlers={handlers} />;
				})}
			</div>

			{/* The tab contents */}
			<div className="grow h-full max-h-full max-w-full w-full overflow-auto">{routerConfig()}</div>
		</div>
	);
});

type FileTabHeaderProps = {
	file: FileTabPageProps;
	handlers: FileTabsHandle;
};

const FileTabHeader: React.FunctionComponent<FileTabHeaderProps> = (props) => {
	const { file, handlers } = props;

	const isTemporarilyOpen = !file.isPermanentlyOpen && !file.preventUserClose;
	const isCurrentFileOpen = handlers.getOpenFile()?.tabKey === file.tabKey;

	const onCloseClick: React.MouseEventHandler<HTMLSpanElement> = (event) => {
		event.preventDefault();
		event.stopPropagation();
		handlers.closeFile(file);
	};

	const onOpenFileClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
		// event.preventDefault();
		// event.stopPropagation();

		if (isCurrentFileOpen && isTemporarilyOpen) {
			handlers.setFilePermaOpen(file);
			return;
		}

		handlers.openFile(file);
	};

	const onDoubleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
		// event.preventDefault();
		// event.stopPropagation();

		handlers.setFilePermaOpen(file);
	};

	return (
		<Link
			key={file.tabKey}
			to={file.linkPath}
			className={clsx([
				'flex flex-row h-full border border-b-0 pt-2 pb-1 pl-2 cursor-pointer items-baseline',
				{
					'pr-2': file.preventUserClose,
					'bg-sidebar-accent': isCurrentFileOpen,
				},
			])}
			onDoubleClick={onDoubleClick}
			onClick={onOpenFileClick}
		>
			<span
				className={clsx('pr-1', {
					italic: isTemporarilyOpen,
				})}
			>
				{file.titleRender()}
			</span>

			{/* {props.preventUserClose === true ? null : <X onClick={onCloseClick} />} */}
			{file.preventUserClose === true ? null : (
				<span
					className={clsx('h-6 w-6 mr-1 flex rounded-md items-center justify-center', {
						'hover:bg-sidebar': isCurrentFileOpen,
						'hover:bg-accent': !isCurrentFileOpen,
					})}
					onClick={onCloseClick}
				>
					x
				</span>
			)}
		</Link>
	);
};
