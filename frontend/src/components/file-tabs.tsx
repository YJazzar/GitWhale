import { X } from 'lucide-react';
import { forwardRef, ReactElement, useImperativeHandle, useMemo, useState } from 'react';

export type FileTabsHandle = {
	closeFile: (fileKeyToClose: string) => void;
	openNewPage: (newPage: FileTabPageProps) => void;
};

export type FileTabsProps = {
	defaultTabKey: string;
	initialPages: FileTabPageProps[];
};

export type FileTabPageProps = {
	key: string;
	render: () => JSX.Element;
	title: string;
	preventUserClose?: boolean | undefined;
};

export const FileTabs = forwardRef<FileTabsHandle, FileTabsProps>((props, ref) => {
	const { defaultTabKey, initialPages } = props;

	const [activeTabKey, setActiveTabKey] = useState(defaultTabKey);
	const [availableFiles, setAvailableFiles] = useState(initialPages);

	// Convert the availablePages into a map for easy lookup
	const availableFileMap = useMemo(() => {
		const map: Map<string, FileTabPageProps> = new Map();
		availableFiles.forEach((page) => {
			map.set(page.key, page);
		});

		return map;
	}, [availableFiles]);

	// Hooks that can be called by the parent component
	useImperativeHandle(ref, () => ({
		onOpenFile(fileKeyToOpen: string) {
			onOpenFile(fileKeyToOpen);
		},
		closeFile(fileKeyToClose: string) {
			onCloseFile(fileKeyToClose);
		},
		openNewPage(newPage: FileTabPageProps) {
			setAvailableFiles([
				...availableFiles.filter((openFile) => openFile.key !== newPage.key),
				newPage,
			]);
			setActiveTabKey(newPage.key);
		},
	}));

	const currentActiveFile = availableFileMap.get(activeTabKey);

	const onCloseFile = (fileKeyToClose: string) => {
		setAvailableFiles([...availableFiles.filter((openFile) => openFile.key !== fileKeyToClose)]);
	};

	const onOpenFile = (fileToOpen: string) => {
		setActiveTabKey(fileToOpen);
	};

	return (
		<div className="h-full w-full flex flex-col">
			{/* The tabs */}
			<div className="h-fit flex flex-row">
				{availableFiles.map((file) => {
					return <FileTabHeader {...file} onCloseFile={onCloseFile} onOpenFile={onOpenFile} />;
				})}
			</div>

			{/* The tab contents */}
			{currentActiveFile ? <FileTabPage {...currentActiveFile} /> : null}
		</div>
	);
});

type FileTabHeaderProps = FileTabPageProps & {
	onCloseFile: (fileKeyToClose: string) => void;
	onOpenFile: (fileKeyToOpen: string) => void;
};

const FileTabHeader: React.FunctionComponent<FileTabHeaderProps> = (props) => {
	const onCloseClick: React.MouseEventHandler<SVGSVGElement> = (event) => {
		event.preventDefault();
		props.onCloseFile(props.key);
	};

	const onOpenFileClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
		event.preventDefault();
		props.onOpenFile(props.key);
	};

	return (
		<div className="flex flex-row h-full border p-2" onClick={onOpenFileClick}>
			{props.title}
			{props.preventUserClose === true ? null : <X onClick={onCloseClick} />}
		</div>
	);
};

export const FileTabPage: React.FunctionComponent<FileTabPageProps> = (props) => {
	return <div className="grow">{props.render()}</div>;
};
