import { ChevronDown, ChevronRight } from 'lucide-react';
import { KeyboardEventHandler, useState } from 'react';
import { backend } from '../../wailsjs/go/models';
import { Button } from './ui/button';

interface TreeNodeProps {
	directory: backend.Directory;
	onFileClick: (file: backend.FileInfo) => void;
}

const leftPadding = 'pl-6';
const offsetLeftPadding = 'pl-4'; // needs to be 4 smaller than leftPadding
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
				className={`w-full ${offsetLeftPadding} rounded-none  justify-start cursor-pointer flex gap-2 ${greyTextColor} `}
			>
				{isOpen ? <ChevronDown /> : <ChevronRight />}
				{props.directory.Name}
			</Button>
			{isOpen && (
				<div className={`relative inset-0 `}>
					<div
						className={`${leftPadding} before:h-full before:absolute before:top-0 before:border-slate-500 before:border-l before:left`}
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
			)}
		</div>
	);
}

export function FileNode(props: {
	file: backend.FileInfo;
	onKeyDown: KeyboardEventHandler<HTMLButtonElement>;
	onFileClick: (file: backend.FileInfo) => void;
}) {
	const { file, onFileClick } = props;

	const onClick = () => {
		onFileClick(file);
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
	} else if (!file.LeftDirAbsPath && file.RightDirAbsPath) {
		fileColor = greyTextColor;
		fileDescription = ' (Unknown)';
	}

	return (
		<Button
			onClick={onClick}
			onKeyDown={props.onKeyDown}
			variant={'ghost'}
			className={`w-full ${leftPadding} ${fileColor} rounded-none my-1 items-center justify-start`}
		>
			{file.Name}
			<span className={`${greyTextColor} text-xs`}>{fileDescription}</span>
		</Button>
	);
}
