import { EmptyState } from '@/components/empty-state';
import { FileTabs } from '@/components/file-tabs/file-tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Separator } from '@/components/ui/separator';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { getStagingState } from '@/hooks/state/repo/use-git-staging-state';
import { FileTabsSessionKeyGenerator, TabProps, useFileTabsHandlers } from '@/hooks/state/useFileTabsHandlers';
import { usePersistentPanelSizes } from '@/hooks/use-persistent-panel-sizes';
import { cn } from '@/lib/utils';
import Logger from '@/utils/logger';
import { 
	GitAdd, 
	GitCommit, 
	Plus, 
	Minus, 
	FileText, 
	AlertCircle,
	RefreshCw,
	CheckCircle2
} from 'lucide-react';
import { useState } from 'react';
import { git_operations } from '../../../wailsjs/go/models';
import FileDiffView from '@/components/file-diff-view';

interface RepoActiveDiffPageProps {
	repoPath: string;
}

export default function RepoActiveDiffPage({ repoPath }: RepoActiveDiffPageProps) {
	const { diffState } = useRepoState(repoPath);
	const stagingState = getStagingState(repoPath);
	
	const [commitMessage, setCommitMessage] = useState('');
	const [isCommitting, setIsCommitting] = useState(false);

	// Persistent panel sizes for file lists (left) and diff content (right)
	const [panelSizes, setPanelSizes] = usePersistentPanelSizes(
		'gitwhale-staging-panel-sizes',
		[35, 65] // file-lists: 35%, diff-content: 65%
	);

	const handleLayoutChange = (sizes: number[]) => {
		if (sizes.length === 2) {
			setPanelSizes(sizes);
		}
	};

	const handleCommit = async () => {
		if (!commitMessage.trim()) {
			Logger.error('Commit message cannot be empty', 'StagingPage');
			return;
		}

		setIsCommitting(true);
		try {
			await stagingState.commitChanges(commitMessage.trim());
			setCommitMessage(''); // Clear the message after successful commit
			Logger.info('Successfully committed changes', 'StagingPage');
		} catch (error) {
			Logger.error(`Failed to commit: ${error}`, 'StagingPage');
		} finally {
			setIsCommitting(false);
		}
	};

	const handleRefresh = () => {
		stagingState.refreshGitStatus();
	};

	// Show empty state if no changes
	if (!stagingState.isLoading && !stagingState.hasChanges) {
		return (
			<EmptyState
				title={() => (
					<>
						<GitAdd className="w-5 h-5" />
						No Changes
					</>
				)}
				message="Your working directory is clean. All files are up to date."
				action={
					<Button onClick={handleRefresh} variant="outline" size="sm">
						<RefreshCw className="w-4 h-4 mr-2" />
						Refresh
					</Button>
				}
			/>
		);
	}

	return (
		<div className="w-full h-full flex flex-row min-h-0">
			<ResizablePanelGroup direction="horizontal" onLayout={handleLayoutChange}>
				{/* Left pane: File lists and commit form */}
				<ResizablePanel id="file-lists-panel" defaultSize={panelSizes[0]} minSize={25}>
					<div className="border-r h-full flex flex-col">
						{/* Header */}
						<div className="p-3 border-b bg-muted/30">
							<div className="flex items-center justify-between">
								<h2 className="font-semibold text-sm flex items-center gap-2">
									<GitAdd className="w-4 h-4" />
									Staging Area
								</h2>
								<Button
									onClick={handleRefresh}
									variant="ghost"
									size="sm"
									disabled={stagingState.isLoading}
								>
									<RefreshCw className={cn("w-3.5 h-3.5", stagingState.isLoading && "animate-spin")} />
								</Button>
							</div>
						</div>

						{/* File lists - scrollable area */}
						<div className="flex-1 overflow-y-auto">
							{/* Staged Files */}
							<StagedFilesList
								files={stagingState.gitStatus.value?.stagedFiles ?? []}
								onUnstageFile={stagingState.unstageFile}
								onUnstageAll={stagingState.unstageAllFiles}
								isLoading={stagingState.isLoading}
								repoPath={repoPath}
							/>

							<Separator />

							{/* Unstaged Files */}
							<UnstagedFilesList
								files={stagingState.gitStatus.value?.unstagedFiles ?? []}
								onStageFile={stagingState.stageFile}
								onStageAll={stagingState.stageAllFiles}
								isLoading={stagingState.isLoading}
								repoPath={repoPath}
							/>

							<Separator />

							{/* Untracked Files */}
							<UntrackedFilesList
								files={stagingState.gitStatus.value?.untrackedFiles ?? []}
								onStageFile={stagingState.stageFile}
								isLoading={stagingState.isLoading}
								repoPath={repoPath}
							/>
						</div>

						{/* Commit form */}
						<div className="p-3 border-t bg-muted/20">
							<div className="space-y-3">
								<div>
									<label htmlFor="commit-message" className="text-sm font-medium">
										Commit Message
									</label>
									<Input
										id="commit-message"
										placeholder="Enter commit message..."
										value={commitMessage}
										onChange={(e) => setCommitMessage(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
												handleCommit();
											}
										}}
										disabled={isCommitting || !stagingState.hasStagedChanges}
									/>
								</div>
								<Button
									onClick={handleCommit}
									disabled={!commitMessage.trim() || !stagingState.hasStagedChanges || isCommitting}
									className="w-full"
									size="sm"
								>
									{isCommitting ? (
										<RefreshCw className="w-4 h-4 mr-2 animate-spin" />
									) : (
										<GitCommit className="w-4 h-4 mr-2" />
									)}
									{isCommitting ? 'Committing...' : 'Commit Changes'}
								</Button>
								{stagingState.hasStagedChanges && (
									<p className="text-xs text-muted-foreground text-center">
										{stagingState.gitStatus.value?.stagedFiles?.length ?? 0} file(s) staged for commit
									</p>
								)}
							</div>
						</div>
					</div>
				</ResizablePanel>

				<ResizableHandle withHandle />

				{/* Right pane: Diff viewer */}
				<ResizablePanel id="diff-content-panel" defaultSize={panelSizes[1]}>
					<div className="grow h-full flex flex-col min-h-0">
						<FileTabs
							key={`staging-${repoPath}`}
							initialTabs={[]}
							fileTabManageSessionKey={FileTabsSessionKeyGenerator.stagingArea(repoPath)}
						/>
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}

// Staged Files List Component
interface StagedFilesListProps {
	files: git_operations.GitStatusFile[];
	onUnstageFile: (filePath: string) => Promise<void>;
	onUnstageAll: () => Promise<void>;
	isLoading: boolean;
	repoPath: string;
}

function StagedFilesList({ files, onUnstageFile, onUnstageAll, isLoading, repoPath }: StagedFilesListProps) {
	return (
		<FileListSection
			title="Staged Changes"
			icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
			files={files}
			action="unstage"
			onFileAction={onUnstageFile}
			onBulkAction={onUnstageAll}
			isLoading={isLoading}
			repoPath={repoPath}
			emptyMessage="No staged changes"
		/>
	);
}

// Unstaged Files List Component
interface UnstagedFilesListProps {
	files: git_operations.GitStatusFile[];
	onStageFile: (filePath: string) => Promise<void>;
	onStageAll: () => Promise<void>;
	isLoading: boolean;
	repoPath: string;
}

function UnstagedFilesList({ files, onStageFile, onStageAll, isLoading, repoPath }: UnstagedFilesListProps) {
	return (
		<FileListSection
			title="Changes"
			icon={<AlertCircle className="w-4 h-4 text-amber-600" />}
			files={files}
			action="stage"
			onFileAction={onStageFile}
			onBulkAction={onStageAll}
			isLoading={isLoading}
			repoPath={repoPath}
			emptyMessage="No changes"
		/>
	);
}

// Untracked Files List Component
interface UntrackedFilesListProps {
	files: git_operations.GitStatusFile[];
	onStageFile: (filePath: string) => Promise<void>;
	isLoading: boolean;
	repoPath: string;
}

function UntrackedFilesList({ files, onStageFile, isLoading, repoPath }: UntrackedFilesListProps) {
	return (
		<FileListSection
			title="Untracked Files"
			icon={<FileText className="w-4 h-4 text-blue-600" />}
			files={files}
			action="stage"
			onFileAction={onStageFile}
			onBulkAction={async () => {
				// Stage each untracked file individually
				for (const file of files) {
					await onStageFile(file.path);
				}
			}}
			isLoading={isLoading}
			repoPath={repoPath}
			emptyMessage="No untracked files"
		/>
	);
}

// Generic File List Section Component
interface FileListSectionProps {
	title: string;
	icon: React.ReactNode;
	files: git_operations.GitStatusFile[];
	action: 'stage' | 'unstage';
	onFileAction: (filePath: string) => Promise<void>;
	onBulkAction: () => Promise<void>;
	isLoading: boolean;
	repoPath: string;
	emptyMessage: string;
}

function FileListSection({
	title,
	icon,
	files,
	action,
	onFileAction,
	onBulkAction,
	isLoading,
	repoPath,
	emptyMessage,
}: FileListSectionProps) {
	const fileTabsHandlers = useFileTabsHandlers(FileTabsSessionKeyGenerator.stagingArea(repoPath));

	const getStatusBadge = (file: git_operations.GitStatusFile) => {
		const status = file.stagedStatus !== ' ' ? file.stagedStatus : file.workingStatus;
		const colorMap: Record<string, string> = {
			M: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
			A: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
			D: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
			R: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
			C: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
			'?': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
		};

		return (
			<span className={cn("text-xs font-mono rounded px-1 py-0.5", colorMap[status] || colorMap['?'])}>
				{status}
			</span>
		);
	};

	const openFileInDiff = (file: git_operations.GitStatusFile) => {
		// Create a mock FileInfo for the diff viewer
		const fileInfo: git_operations.FileInfo = {
			Name: file.path.split('/').pop() || file.path,
			Path: file.path,
			IsDir: false,
			Size: 0,
			Mode: 0,
			ModTime: '',
			FileType: 'modified', // This could be enhanced based on status
		};

		const tabKey = `staging-${file.path}`;
		const tab: TabProps = {
			tabKey,
			titleRender: () => (
				<span className="flex items-center gap-1">
					{getStatusBadge(file)}
					{fileInfo.Name}
				</span>
			),
			component: <FileDiffView file={fileInfo} />,
			isPermanentlyOpen: false,
		};

		fileTabsHandlers.openTab(tab);
		Logger.info(`Opened file diff for: ${file.path}`, 'StagingPage');
	};

	return (
		<div className="p-3">
			<div className="flex items-center justify-between mb-2">
				<h3 className="text-sm font-medium flex items-center gap-2">
					{icon}
					{title} ({files.length})
				</h3>
				{files.length > 0 && (
					<Button
						onClick={onBulkAction}
						variant="ghost"
						size="sm"
						disabled={isLoading}
						className="h-6 px-2 text-xs"
					>
						{action === 'stage' ? (
							<Plus className="w-3 h-3 mr-1" />
						) : (
							<Minus className="w-3 h-3 mr-1" />
						)}
						{action === 'stage' ? 'Stage All' : 'Unstage All'}
					</Button>
				)}
			</div>

			{files.length === 0 ? (
				<p className="text-xs text-muted-foreground">{emptyMessage}</p>
			) : (
				<div className="space-y-1">
					{files.map((file) => (
						<div
							key={file.path}
							className="flex items-center gap-2 p-1 rounded hover:bg-accent/70 group cursor-pointer"
							onClick={() => openFileInDiff(file)}
						>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									{getStatusBadge(file)}
									<span className="text-sm truncate" title={file.path}>
										{file.path}
									</span>
								</div>
								{file.oldPath && (
									<p className="text-xs text-muted-foreground ml-8">
										renamed from {file.oldPath}
									</p>
								)}
							</div>
							<Button
								onClick={(e) => {
									e.stopPropagation();
									onFileAction(file.path);
								}}
								variant="ghost"
								size="sm"
								disabled={isLoading}
								className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 shrink-0"
							>
								{action === 'stage' ? (
									<Plus className="w-3 h-3" />
								) : (
									<Minus className="w-3 h-3" />
								)}
							</Button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}