import clsx from 'clsx';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
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
};

export const FileTabs = forwardRef<FileTabsHandle, FileTabsProps>((props, ref) => {
	const { defaultTabKey, initialPages, routerConfig, noTabSelectedPath } = props;

	const [activeTabKey, setActiveTabKey] = useState<string | undefined>(defaultTabKey);
	const [availableFiles, setAvailableFiles] = useState<FileTabPageProps[]>(initialPages);

	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		console.log('Location changed to: ' + JSON.stringify(location));
	}, [location]);

	// Convert the availablePages into a map for easy lookup
	const availableFileMap = useMemo(() => {
		const map: Map<string, FileTabPageProps> = new Map();
		availableFiles.forEach((page) => {
			map.set(page.tabKey, page);
		});

		return map;
	}, [availableFiles]);

	const navigateToFile = (file: FileTabPageProps | undefined) => {
		setActiveTabKey(file?.tabKey);

		// Need to go back to the parent path
		if (!file?.linkPath) {
			console.log('navigating to parent path');
			navigate(noTabSelectedPath, { replace: true });
		} else {
			console.log('navigating to new path: ');
			console.log(file);
			navigate(file.linkPath, { replace: true });
		}
	};

	const handlers: FileTabsHandle = {
		closeFile: function (fileToClose: FileTabPageProps): void {
			// Get the current active index, and then increment it if the file is open
			let prevActiveIndex = availableFiles.findIndex((file) => file.tabKey === activeTabKey);
			if (fileToClose.tabKey === activeTabKey) {
				prevActiveIndex += 1;
			}

			const newAvailableTabs = availableFiles.filter((openFile) => {
				if (openFile.tabKey === fileToClose.tabKey) {
					return false; // close the tab
				}

				// Only keep necessary tabs open
				return openFile.isPermanentlyOpen || openFile.preventUserClose;
			});

			// Update state
			prevActiveIndex %= newAvailableTabs.length;
			if (prevActiveIndex < newAvailableTabs.length) {
				navigateToFile(newAvailableTabs[prevActiveIndex]);
			} else {
				navigateToFile(undefined);
			}
			setAvailableFiles([...newAvailableTabs]);
		},
		openFile: function (newPage: FileTabPageProps): void {
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
		},
		getOpenFile: function (): FileTabPageProps | undefined {
			if (activeTabKey) {
				return availableFileMap.get(activeTabKey);
			}
		},
		getFileProps: function (fileKey: string): FileTabPageProps | undefined {
			return availableFileMap.get(fileKey);
		},
		setFilePermaOpen: function (fileToKeepOpen: FileTabPageProps): void {
			let newAvailableTabs = availableFiles.map((file) => {
				if (file.tabKey === fileToKeepOpen.tabKey) {
					file.isPermanentlyOpen = true;
				}
				return file;
			});
			setAvailableFiles(newAvailableTabs);
		},
	};

	// Hooks that can be called by the parent component
	useImperativeHandle(ref, () => handlers);

	return (
		<div className="h-full w-full flex flex-col">
			{/* The tabs */}
			<div className="h-fit flex flex-row border-b-2">
				{availableFiles.map((file) => {
					return <FileTabHeader key={file.tabKey} file={file} handlers={handlers} />;
				})}
			</div>

			{/* The tab contents */}
			<div className="grow h-full">{routerConfig()}</div>
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
				'flex flex-row h-full border py-2 pl-2 cursor-pointer',
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
