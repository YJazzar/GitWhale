import { ChevronDown, ChevronRight, File, Folder, FolderOpen, List, ListTree } from 'lucide-react';
import { KeyboardEventHandler, useEffect, useMemo, useState } from 'react';
import { git_operations } from '../../../wailsjs/go/models';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TabProps, useFileTabsHandlers } from '@/hooks/state/useFileTabsHandlers';
import FileDiffView from '../file-diff-view';
import { useFileTabsState } from '@/hooks/state/useFileTabsState';
import Logger from '@/utils/logger';
import { DiffFileListItem } from './diff-file-list-item';

interface FileTreeProps {
	directoryData: git_operations.Directory;
	fileTabsSessionKey: string;
	className?: string;
}

type FileTreeViewMode = 'tree' | 'list';

const FILE_TREE_VIEW_MODE_STORAGE_KEY = 'gitwhale-diff-file-view-mode';

// TODO: Use a Jotai state atom to simplify this logic 
function resolveStoredViewMode(): FileTreeViewMode {
	if (typeof window === 'undefined') {
		return 'tree';
	}

	try {
		const storedValue = window.localStorage.getItem(FILE_TREE_VIEW_MODE_STORAGE_KEY);
		return storedValue === 'list' ? 'list' : 'tree';
	} catch {
		return 'tree';
	}
}

// TODO: Use a Jotai state atom to simplify this logic 
function usePersistentFileTreeViewMode(): [FileTreeViewMode, (mode: FileTreeViewMode) => void] {
	const [viewMode, setViewMode] = useState<FileTreeViewMode>(() => resolveStoredViewMode());

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		try {
			window.localStorage.setItem(FILE_TREE_VIEW_MODE_STORAGE_KEY, viewMode);
		} catch (error) {
			Logger.warning(`Failed to persist diff file list view preference: ${error}`, 'FileTree');
		}
	}, [viewMode]);

	return [viewMode, setViewMode];
}

export function FileTree({ directoryData, fileTabsSessionKey, className }: FileTreeProps) {
	const fileTabsHandlers = useFileTabsHandlers(fileTabsSessionKey);
	const fileTabsState = useFileTabsState(fileTabsSessionKey);
	const [viewMode, setViewMode] = usePersistentFileTreeViewMode();

	const flattenedFiles = useMemo(() => flattenDirectory(directoryData), [directoryData]);

	const activeFileOpen = fileTabsState.activeTabKey;

	const onOpenFile = (file: git_operations.FileInfo, keepFileOpen: boolean) => {
		const tabKey = getFileKey(file);

		let fileToOpen: TabProps = {
			tabKey: tabKey,
			titleRender: () => <>{file.Name}</>,
			component: <FileDiffView file={file} />,
			isPermanentlyOpen: keepFileOpen,
		};

		fileTabsHandlers.openTab(fileToOpen);
		if (keepFileOpen) {
			fileTabsHandlers.setTabPermaOpen(fileToOpen);
		}
	};

	const focusRelativeItem = (direction: 1 | -1) => {
		const focusableElements = document.querySelectorAll('[data-tree-item]');
		if (!focusableElements.length) {
			return;
		}

		const currentIndex = Array.prototype.indexOf.call(focusableElements, document.activeElement);
		const safeIndex = currentIndex === -1 ? (direction === 1 ? 0 : focusableElements.length - 1) : currentIndex;
		const nextIndex = (safeIndex + direction + focusableElements.length) % focusableElements.length;
		(focusableElements[nextIndex] as HTMLElement).focus();
	};

	const handleListKeyDown: KeyboardEventHandler<HTMLButtonElement> = (event) => {
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			event.stopPropagation();
			focusRelativeItem(-1);
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			event.stopPropagation();
			focusRelativeItem(1);
		}
	};

	const handleChangeViewMode = (mode: FileTreeViewMode) => {
		if (viewMode !== mode) {
			setViewMode(mode);
		}
	};

	return (
		<TooltipProvider delayDuration={250}>
			<div className={cn('w-full h-full bg-background flex flex-col', className)}>
				<div className="flex items-center justify-between px-2 py-1 border-b border-border/60">
					<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Files</span>
					<div className="flex items-center gap-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									size="icon"
									variant={viewMode === 'tree' ? 'secondary' : 'ghost'}
									className="h-7 w-7"
									onClick={() => handleChangeViewMode('tree')}
									aria-pressed={viewMode === 'tree'}
									aria-label="Tree view"
								>
									<ListTree className="h-3.5 w-3.5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">Tree view</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									size="icon"
									variant={viewMode === 'list' ? 'secondary' : 'ghost'}
									className="h-7 w-7"
									onClick={() => handleChangeViewMode('list')}
									aria-pressed={viewMode === 'list'}
									aria-label="List view"
								>
									<List className="h-3.5 w-3.5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">List view</TooltipContent>
						</Tooltip>
					</div>
				</div>
				<div className="flex-1 overflow-auto">
					<div className="p-2">
						{viewMode === 'tree' ? (
							<TreeNode
								directory={directoryData}
								onFileClick={onOpenFile}
								depth={0}
								activeFileOpen={activeFileOpen}
							/>
						) : flattenedFiles.length > 0 ? (
							<div className="flex flex-col gap-1">
								{flattenedFiles.map((file) => (
									<FileNode
										key={getFileKey(file)}
										file={file}
										onKeyDown={handleListKeyDown}
										onFileClick={onOpenFile}
										depth={0}
										activeFileOpen={activeFileOpen}
										viewMode="list"
									/>
								))}
							</div>
						) : (
							<div className="px-1 py-2 text-xs text-muted-foreground">No files to display</div>
						)}
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
}

const getFileKey = (file: git_operations.FileInfo) => {
	return `${file.Path}/${file.Name}`;
};

function flattenDirectory(directory: git_operations.Directory | undefined) {
	const flattenedFiles: git_operations.FileInfo[] = [];

	const traverse = (dir: git_operations.Directory | undefined) => {
		if (!dir) {
			return;
		}

		dir.Files?.forEach((file) => {
			flattenedFiles.push(file);
		});

		dir.SubDirs?.forEach((childDirectory) => traverse(childDirectory));
	};

	traverse(directory);

	return flattenedFiles;
}

interface TreeNodeProps {
	directory: git_operations.Directory;
	onFileClick: (file: git_operations.FileInfo, keepFileOpen: boolean) => void;
	depth: number;
	activeFileOpen: string | undefined; // The tabkey of the file that's open (used for highlighting the right tab)
}

function TreeNode({ directory, onFileClick, depth, activeFileOpen }: TreeNodeProps) {
	const [isOpen, setIsOpen] = useState(true);

	const toggleCollapse = () => {
		setIsOpen(!isOpen);
	};

	const handleKeyDown: KeyboardEventHandler<HTMLButtonElement> = (event) => {
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			event.stopPropagation()
			moveFocus(-1);
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			event.stopPropagation()
			moveFocus(1);
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			event.stopPropagation()
			setIsOpen(false);
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			event.stopPropagation()
			setIsOpen(true);
		} else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			event.stopPropagation()
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
							<ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
						) : (
							<ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
						)
					) : (
						<div className="w-3 h-3 shrink-0" />
					)}

					{isOpen ? (
						<FolderOpen className="h-3.5 w-3.5 text-blue-500 shrink-0" />
					) : (
						<Folder className="h-3.5 w-3.5 text-blue-600 shrink-0" />
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
							activeFileOpen={activeFileOpen}
						/>
					))}

					{directory.Files.map((childFile) => (
						<FileNode
							key={getFileKey(childFile)}
							file={childFile}
							onKeyDown={handleKeyDown}
							onFileClick={onFileClick}
							depth={depth + 1}
							activeFileOpen={activeFileOpen}
							viewMode="tree"
						/>
					))}
				</div>
			)}
		</div>
	);
}

interface FileNodeProps {
	file: git_operations.FileInfo;
	onKeyDown: KeyboardEventHandler<HTMLElement>;
	onFileClick: (file: git_operations.FileInfo, keepFileOpen: boolean) => void;
	depth: number;
	activeFileOpen: string | undefined;
	viewMode: FileTreeViewMode;
}

function FileNode({ file, onKeyDown, onFileClick, depth, activeFileOpen, viewMode }: FileNodeProps) {
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
				hoverBgColor: 'hover:bg-amber-50 dark:hover:bg-amber-950/30',
				bgColor: 'bg-amber-50 dark:bg-amber-950/40',
				status: 'M',
				tooltip: 'Modified file',
			};
		} else if (file.LeftDirAbsPath && !file.RightDirAbsPath) {
			return {
				color: 'text-red-600 dark:text-red-400',
				hoverBgColor: 'hover:bg-red-50 dark:hover:bg-red-950/30',
				bgColor: 'bg-red-50 dark:bg-red-950/40',
				status: 'D',
				tooltip: 'Deleted file',
			};
		} else if (!file.LeftDirAbsPath && file.RightDirAbsPath) {
			return {
				color: 'text-green-600 dark:text-green-400',
				hoverBgColor: 'hover:bg-green-50 dark:hover:bg-green-950/30',
				bgColor: 'bg-green-50 dark:bg-green-950/40',
				status: 'A',
				tooltip: 'Added file',
			};
		}
		return {
			color: 'text-muted-foreground',
			hoverBgColor: 'hover:bg-muted/50',
			bgColor: 'bg-muted-50 dark:bg-muted-950/20',
			status: '?',
			tooltip: 'Unknown status',
		};
	};

	const { color, hoverBgColor, bgColor, status, tooltip } = getFileStatus();

	const isFileActive = useMemo(() => {
		return activeFileOpen === getFileKey(file);
	}, [file, activeFileOpen]);

	const normalizedPath = useMemo(
		() => (file.Path || '').replace(/\\/g, '/').replace(/^\.\//, ''),
		[file.Path]
	);

	const listDirectoryLabel = useMemo(() => {
		if (!normalizedPath) {
			return '';
		}

		const lastSlashIndex = normalizedPath.lastIndexOf('/');
		if (lastSlashIndex === -1) {
			return '';
		}

		return normalizedPath.slice(0, lastSlashIndex);
	}, [normalizedPath]);

	const listPrimaryLabel = useMemo(() => {
		if (!normalizedPath) {
			return file.Name;
		}

		const lastSlashIndex = normalizedPath.lastIndexOf('/');
		if (lastSlashIndex === -1) {
			return normalizedPath;
		}

		return normalizedPath.slice(lastSlashIndex + 1);
	}, [normalizedPath, file.Name]);

	const tooltipPathLabel = normalizedPath || file.Name;

	if (viewMode === 'list') {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<DiffFileListItem
						data-tree-item
						onClick={onClick}
						onDoubleClick={onDoubleClick}
						onKeyDown={onKeyDown}
						status={status}
						primaryText={listPrimaryLabel}
						secondaryText={listDirectoryLabel || undefined}
						isActive={isFileActive}
						activeClassName={bgColor}
						title={tooltipPathLabel}
						className="px-2"
					/>
				</TooltipTrigger>
				<TooltipContent side="right" align="start">
					<div className="text-xs">
						<p className="font-semibold">{tooltip}</p>
						<p className="mt-1 break-words text-muted-foreground">{tooltipPathLabel}</p>
					</div>
				</TooltipContent>
			</Tooltip>
		);
	}

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
						'w-full justify-start h-7 px-1 py-1 font-normal text-sm transition-colors duration-150 focus-visible:ring-1 gap-2',
						isFileActive && bgColor,
						hoverBgColor
					)}
					style={{ paddingLeft: `${depth * 12 + 16}px` }}
					title={tooltipPathLabel}
				>
					<div className="flex items-center gap-1.5 min-w-0 flex-1">
						<File className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />

						<span className={cn('truncate', color)}>{file.Name}</span>

						<span
							className={cn(
								'text-xs font-mono rounded px-1 py-0.5 text-white shrink-0 ml-auto',
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
			<TooltipContent side="right" align="start">
				<div className="text-xs">
					<p className="font-semibold">{tooltip}</p>
					<p className="mt-1 break-words text-muted-foreground">{tooltipPathLabel}</p>
				</div>
			</TooltipContent>
		</Tooltip>
	);
}
