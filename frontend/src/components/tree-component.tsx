import clsx from 'clsx';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { KeyboardEventHandler, useState } from 'react';
import { git_operations } from '../../wailsjs/go/models';
import { Button } from './ui/button';

interface TreeNodeProps {
	directory: git_operations.Directory;
	onFileClick: (file: git_operations.FileInfo, keepFileOpen: boolean) => void;
}

const greyTextColor = 'text-slate-500';

// A component to represent an individual folder or file
export function TreeNode(props: TreeNodeProps) {
	const [isOpen, setIsOpen] = useState(true);

	const toggleCollapse = () => {
		setIsOpen(!isOpen);
	};

	const handleKeyDown: KeyboardEventHandler<HTMLButtonElement> = (event) => {
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			moveFocus(-1); // Move focus to the previous element
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			moveFocus(1); // Move focus to the next element
		}
	};

	const moveFocus = (direction: 1 | -1) => {
		const focusableElements = document.querySelectorAll('button');
		const currentIndex = Array.prototype.indexOf.call(focusableElements, document.activeElement);
		const nextIndex = (currentIndex + direction + focusableElements.length) % focusableElements.length;
		focusableElements[nextIndex].focus();
	};

	return (
		<div className={`items-start justify-start`}>
			<Button
				onKeyDown={handleKeyDown}
				onClick={toggleCollapse}
				variant={'ghost'}
				className={`w-full pl-1 rounded-none  justify-start cursor-pointer flex gap-0 ${greyTextColor} `}
			>
				{isOpen ? <ChevronDown className="pl-0" /> : <ChevronRight />}
				{props.directory.Name}
			</Button>

			{/* The sub-folders and sub-files in this node */}
			<div
				className={clsx([
					`relative inset-0 `,
					{
						hidden: !isOpen,
					},
				])}
			>
				<div
					className={`pl-3 before:h-full before:absolute before:top-0 before:border-slate-500 before:border-l before:left`}
				>
					{props.directory.SubDirs.map((childDirectory) => (
						<TreeNode
							key={childDirectory.Path}
							directory={childDirectory}
							onFileClick={props.onFileClick}
						/>
					))}

					{props.directory.Files.map((childFile) => (
						<FileNode
							key={childFile.Path}
							file={childFile}
							onKeyDown={handleKeyDown}
							onFileClick={props.onFileClick}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

export function FileNode(props: {
	file: git_operations.FileInfo;
	onKeyDown: KeyboardEventHandler<HTMLButtonElement>;
	onFileClick: (file: git_operations.FileInfo, keepFileOpen: boolean) => void;
}) {
	const { file, onFileClick } = props;

	const onClick = () => {
		onFileClick(file, false);
	};

	const onDoubleClick = () => {
		onFileClick(file, true);
	};

	let fileColor = '';
	let fileDescription = '';

	if (file.LeftDirAbsPath && file.RightDirAbsPath) {
		fileColor = 'text-amber-500';
		fileDescription = ' (M)';
	} else if (file.LeftDirAbsPath && !file.RightDirAbsPath) {
		fileColor = 'text-red-700';
		fileDescription = ' (D)';
	} else if (!file.LeftDirAbsPath && file.RightDirAbsPath) {
		fileColor = 'text-green-700';
		fileDescription = ' (A)';
	}

	return (
		<Button
			onClick={onClick}
			onDoubleClick={onDoubleClick}
			onKeyDown={props.onKeyDown}
			variant={'ghost'}
			className={`w-full  pl-2 ${fileColor} rounded-none my-1 items-center justify-start`}
		>
			{file.Name}
			<span className={`${greyTextColor} text-xs`}>{fileDescription}</span>
		</Button>
	);
}
