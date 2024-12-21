import clsx from 'clsx';
import { X } from 'lucide-react';
import { forwardRef, ReactElement, useImperativeHandle, useMemo, useState } from 'react';

export type FileTabsHandle = {
	closeFile: (fileToClose: FileTabPageProps) => void;
	openFile: (fileToOpen: FileTabPageProps) => void;
	getOpenFile: () => FileTabPageProps | undefined;
	setFilePermaOpen: (file: FileTabPageProps) => void;
};

export type FileTabsProps = {
	defaultTabKey: string;
	initialPages: FileTabPageProps[];
};

export type FileTabPageProps = {
	tabKey: string;
	render: () => JSX.Element;
	title: string;
	preventUserClose?: boolean | undefined;
	isPermanentlyOpen?: boolean;
};

export const FileTabs = forwardRef<FileTabsHandle, FileTabsProps>((props, ref) => {
	const { defaultTabKey, initialPages } = props;

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
				setActiveTabKey(newAvailableTabs[prevActiveIndex].tabKey);
			} else {
				setActiveTabKey(undefined);
			}
			setAvailableFiles([...newAvailableTabs]);
		},
		openFile: function (newPage: FileTabPageProps): void {
			// If the page is already open in a different tab
			if (!!availableFileMap.get(newPage.tabKey)) {
				setActiveTabKey(newPage.tabKey);
				return;
			}

			//  Filter out any non-permanently open files
			const newAvailableTabs = availableFiles.filter((openFile) => {
				return openFile.isPermanentlyOpen || openFile.preventUserClose;
			});

			setAvailableFiles([...newAvailableTabs, newPage]);
			setActiveTabKey(newPage.tabKey);
		},
		getOpenFile: function (): FileTabPageProps | undefined {
			if (activeTabKey) {
				return availableFileMap.get(activeTabKey);
			}
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

	const currentActiveFile = handlers.getOpenFile();

	return (
		<div className="h-full w-full flex flex-col">
			{/* The tabs */}
			<div className="h-fit flex flex-row">
				{availableFiles.map((file) => {
					return <FileTabHeader key={file.tabKey} file={file} handlers={handlers} />;
				})}
			</div>

			{/* The tab contents */}
			{currentActiveFile ? <FileTabPage {...currentActiveFile} /> : null}
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

	const onOpenFileClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
		event.preventDefault();
		event.stopPropagation();

		if (isCurrentFileOpen && isTemporarilyOpen) {
			handlers.setFilePermaOpen(file);
			return;
		}

		handlers.openFile(file);
	};

	const onDoubleClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
		event.preventDefault();
		event.stopPropagation();

		handlers.setFilePermaOpen(file);
	};

	return (
		<div
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
				{file.title}
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
		</div>
	);
};

export const FileTabPage: React.FunctionComponent<FileTabPageProps> = (props) => {
	return <div className="grow">{props.render()}</div>;
};
