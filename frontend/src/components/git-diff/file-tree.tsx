import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from 'lucide-react';
import { KeyboardEventHandler, useState } from 'react';
import { git_operations } from '../../../wailsjs/go/models';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TabsManagerHandle } from '../file-tabs';
import { TabProps } from '@/hooks/state/use-file-manager-state';
import FileDiffView from '../file-diff-view';

interface FileTreeProps {
	directoryData: git_operations.Directory;
	tabManagerHandler: React.RefObject<TabsManagerHandle>;
	className?: string;
}

export function FileTree({ directoryData, tabManagerHandler, className }: FileTreeProps) {
	const onOpenFile = (file: git_operations.FileInfo, keepFileOpen: boolean) => {
		const tabKey = getFileKey(file);

		let fileToOpen: TabProps = {
			tabKey: tabKey,
			titleRender: () => <>{file.Name}</>,
			component: <FileDiffView file={file} />,
			isPermanentlyOpen: keepFileOpen,
		};

		tabManagerHandler.current?.openTab(fileToOpen);
		if (keepFileOpen) {
			tabManagerHandler.current?.setTabPermaOpen(fileToOpen);
		}
	};

	return (
		<TooltipProvider delayDuration={250}>
			<div className={cn('w-full h-full overflow-auto bg-background', className)}>
				<div className="p-2">
					<TreeNode directory={directoryData} onFileClick={onOpenFile} depth={0} />
				</div>
			</div>
		</TooltipProvider>
	);
}

const getFileKey = (file: git_operations.FileInfo) => {
	return `${file.Path}/${file.Name}`;
};

interface TreeNodeProps {
	directory: git_operations.Directory;
	onFileClick: (file: git_operations.FileInfo, keepFileOpen: boolean) => void;
	depth: number;
}

function TreeNode({ directory, onFileClick, depth }: TreeNodeProps) {
	const [isOpen, setIsOpen] = useState(true); 

	const toggleCollapse = () => {
		setIsOpen(!isOpen);
	};

	const handleKeyDown: KeyboardEventHandler<HTMLButtonElement> = (event) => {
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			moveFocus(-1);
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			moveFocus(1);
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			setIsOpen(false);
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			setIsOpen(true);
		} else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggleCollapse();
		}
	};

	const moveFocus = (direction: 1 | -1) => {
		const focusableElements = document.querySelectorAll('[data-tree-item]');
		const currentIndex = Array.prototype.indexOf.call(focusableElements, document.activeElement);
		const nextIndex = (currentIndex + direction + focusableElements.length) % focusableElements.length;
		(focusableElements[nextIndex] as HTMLElement).focus();
	};

	const hasChildren = directory.SubDirs.length > 0 || directory.Files.length > 0;

	return (
		<div className="select-none">
			<Button
				data-tree-item
				onKeyDown={handleKeyDown}
				onClick={toggleCollapse}
				variant="ghost"
				size="sm"
				className={cn(
					'w-full justify-start h-7 px-1 py-1 font-normal text-sm hover:bg-accent/70 focus-visible:ring-1',
					'transition-colors duration-150'
				)}
				style={{ paddingLeft: `${depth * 12 + 4}px` }}
			>
				<div className="flex items-center gap-1 min-w-0 flex-1">
					{hasChildren ? (
						isOpen ? (
							<ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
						) : (
							<ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
						)
					) : (
						<div className="w-3 h-3 flex-shrink-0" />
					)}

					{isOpen ? (
						<FolderOpen className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
					) : (
						<Folder className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
					)}

					<span className="truncate text-foreground/90 font-medium">{directory.Name}</span>
				</div>
			</Button>

			{isOpen && hasChildren && (
				<div className="space-y-0.5">
					{directory.SubDirs.map((childDirectory) => (
						<TreeNode
							key={childDirectory.Path}
							directory={childDirectory}
							onFileClick={onFileClick}
							depth={depth + 1}
						/>
					))}

					{directory.Files.map((childFile) => (
						<FileNode
							key={childFile.Path}
							file={childFile}
							onKeyDown={handleKeyDown}
							onFileClick={onFileClick}
							depth={depth + 1}
						/>
					))}
				</div>
			)}
		</div>
	);
}

interface FileNodeProps {
	file: git_operations.FileInfo;
	onKeyDown: KeyboardEventHandler<HTMLButtonElement>;
	onFileClick: (file: git_operations.FileInfo, keepFileOpen: boolean) => void;
	depth: number;
}

function FileNode({ file, onKeyDown, onFileClick, depth }: FileNodeProps) {
	const onClick = () => {
		onFileClick(file, false);
	};

	const onDoubleClick = () => {
		onFileClick(file, true);
	};

	// Determine file status and styling
	const getFileStatus = () => {
		if (file.LeftDirAbsPath && file.RightDirAbsPath) {
			return {
				color: 'text-amber-600 dark:text-amber-400',
				bgColor: 'hover:bg-amber-50 dark:hover:bg-amber-950/30',
				status: 'M',
				tooltip: 'Modified file',
			};
		} else if (file.LeftDirAbsPath && !file.RightDirAbsPath) {
			return {
				color: 'text-red-600 dark:text-red-400',
				bgColor: 'hover:bg-red-50 dark:hover:bg-red-950/30',
				status: 'D',
				tooltip: 'Deleted file',
			};
		} else if (!file.LeftDirAbsPath && file.RightDirAbsPath) {
			return {
				color: 'text-green-600 dark:text-green-400',
				bgColor: 'hover:bg-green-50 dark:hover:bg-green-950/30',
				status: 'A',
				tooltip: 'Added file',
			};
		}
		return {
			color: 'text-muted-foreground',
			bgColor: 'hover:bg-muted/50',
			status: '?',
			tooltip: 'Unknown status',
		};
	};

	const { color, bgColor, status, tooltip } = getFileStatus();

	return (
		<Tooltip>
			<TooltipTrigger asChild>
					<Button
						data-tree-item
						onClick={onClick}
						onDoubleClick={onDoubleClick}
						onKeyDown={onKeyDown}
						variant="ghost"
						size="sm"
						className={cn(
						'w-full justify-start h-7 px-1 py-1 font-normal text-sm',
							'transition-colors duration-150 focus-visible:ring-1',
							bgColor
						)}
					style={{ paddingLeft: `${depth * 12 + 16}px` }}
					>
						<div className="flex items-center gap-1.5 min-w-0 flex-1">
							<File className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" />

							<span className={cn('truncate', color)}>{file.Name}</span>

						<span
							className={cn(
								'text-xs font-mono rounded px-1 py-0.5 text-white flex-shrink-0 ml-auto',
								status === 'M' && 'bg-amber-500',
								status === 'D' && 'bg-red-500',
								status === 'A' && 'bg-green-500',
								status === '?' && 'bg-gray-500'
							)}
						>
							{status}
						</span>
						</div>
					</Button>
			</TooltipTrigger>
			<TooltipContent side="right">
				<p>
					{tooltip}: {file.Name}
				</p>
			</TooltipContent>
		</Tooltip>
	);
}
