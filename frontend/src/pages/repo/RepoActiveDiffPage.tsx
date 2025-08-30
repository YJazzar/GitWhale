import FileDiffView from '@/components/file-diff-view';
import { FileTabs } from '@/components/file-tabs/file-tabs';
import { Button } from '@/components/ui/button';
import { CommitTextarea } from '@/components/ui/commit-textarea';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getStagingState } from '@/hooks/state/repo/use-git-staging-state';
import {
	FileTabsSessionKeyGenerator,
	TabProps,
	useFileTabsHandlers,
} from '@/hooks/state/useFileTabsHandlers';
import { usePersistentPanelSizes } from '@/hooks/use-persistent-panel-sizes';
import { cn } from '@/lib/utils';
import Logger from '@/utils/logger';
import {
	AlertCircle,
	CheckCircle2,
	FileText,
	GitBranch,
	GitCommit,
	Info,
	Minus,
	Plus,
	RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { CleanupStagingDiffSession, CreateStagingDiffSession } from '../../../wailsjs/go/backend/App';
import { git_operations } from '../../../wailsjs/go/models';

interface RepoActiveDiffPageProps {
	repoPath: string;
}

export default function RepoActiveDiffPage({ repoPath }: RepoActiveDiffPageProps) {
	const { refreshGitStatus, hasChanges } = getStagingState(repoPath);

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

	const handleRefresh = () => {
		refreshGitStatus();
	};

	return (
		<div className="w-full h-full flex flex-row min-h-0">
			<ResizablePanelGroup direction="horizontal" onLayout={handleLayoutChange}>
				{/* Left pane: File lists and commit form */}
				<ResizablePanel id="file-lists-panel" defaultSize={panelSizes[0]} minSize={5}>
					<div className="border-r h-full flex flex-col">
						{/* File lists - scrollable area */}
						<div className="flex-1 overflow-y-auto">
							<StagingAreaFileLists repoPath={repoPath} />
						</div>

						{/* Commit form */}
						<CommitForm repoPath={repoPath} />
					</div>
				</ResizablePanel>

				<ResizableHandle withHandle />

				{/* Right pane: Diff viewer */}
				<ResizablePanel id="diff-content-panel" defaultSize={panelSizes[1]}>
					<div className="grow h-full flex flex-col min-h-0">
						{!hasChanges && (
							<div className="w-full h-full flex items-center justify-center">
								<div className="text-center space-y-4">
									<div className="flex items-center justify-center gap-2 text-muted-foreground">
										<GitBranch className="w-8 h-8" />
										<h2 className="text-xl font-semibold">No Changes</h2>
									</div>
									<p className="text-muted-foreground">
										Your working directory is clean. All files are up to date.
									</p>
									<Button onClick={handleRefresh} variant="outline" size="sm">
										<RefreshCw className="w-4 h-4 mr-2" />
										Refresh
									</Button>
								</div>
							</div>
						)}

						{hasChanges && (
							<FileTabs
								key={`staging-${repoPath}`}
								initialTabs={[]}
								fileTabManageSessionKey={FileTabsSessionKeyGenerator.stagingArea(repoPath)}
							/>
						)}
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}

// File Lists Container Component
function StagingAreaFileLists({ repoPath }: { repoPath: string }) {
	const { gitStatus } = getStagingState(repoPath);

	const stagedFiles = gitStatus.value?.stagedFiles ?? [];
	const unstagedFiles = gitStatus.value?.unstagedFiles ?? [];
	const untrackedFiles = gitStatus.value?.untrackedFiles ?? [];

	const hasStagedFiles = stagedFiles.length > 0;
	const hasUnstagedFiles = unstagedFiles.length > 0;
	const hasUntrackedFiles = untrackedFiles.length > 0;

	return (
		<div className="space-y-0">
			{hasStagedFiles && (
				<>
					<StagedFilesList repoPath={repoPath} />
					{(hasUnstagedFiles || hasUntrackedFiles) && <Separator />}
				</>
			)}

			{hasUnstagedFiles && (
				<>
					<UnstagedFilesList repoPath={repoPath} />
					{hasUntrackedFiles && <Separator />}
				</>
			)}

			{hasUntrackedFiles && <UntrackedFilesList repoPath={repoPath} />}
		</div>
	);
}

// Commit Form Component
function CommitForm({ repoPath }: { repoPath: string }) {
	const { commitChanges, refreshGitStatus, hasStagedChanges, gitStatus, isLoading } =
		getStagingState(repoPath);
	const [commitMessage, setCommitMessage] = useState('');
	const [isCommitting, setIsCommitting] = useState(false);

	const handleCommit = async () => {
		if (!commitMessage.trim()) {
			Logger.error('Commit message cannot be empty', 'StagingPage');
			return;
		}

		setIsCommitting(true);
		try {
			await commitChanges(commitMessage.trim());
			setCommitMessage(''); // Clear the message after successful commit
			Logger.info('Successfully committed changes', 'StagingPage');
		} catch (error) {
			Logger.error(`Failed to commit: ${error}`, 'StagingPage');
		} finally {
			setIsCommitting(false);
		}
	};

	const handleRefresh = () => {
		refreshGitStatus();
	};

	const onCommitMessageChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		setCommitMessage(event.target.value);
	};

	return (
		<div className="p-4 border-t bg-muted/20">
			<div className="pb-2">
				<div className="flex justify-between items-center mb-2">
					<div className="flex items-center gap-1">
						<label htmlFor="commit-message" className="text-sm font-medium">
							Commit Message
						</label>

						<TooltipProvider>
							<Tooltip delayDuration={100}>
								<TooltipTrigger asChild>
									<Info className="w-3 h-3 text-muted-foreground cursor-help" />
								</TooltipTrigger>
								<TooltipContent side="right">
									<p>Ctrl+T to rewrap • Cmd/Ctrl+Enter to commit</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					{hasStagedChanges && (
						<span className="text-xs text-muted-foreground">
							{gitStatus.value?.stagedFiles?.length ?? 0} staged
						</span>
					)}
				</div>
				<CommitTextarea
					id="commit-message"
					placeholder="Enter commit message..."
					value={commitMessage}
					onChange={onCommitMessageChange}
					className="h-fit"
				/>
			</div>

			<div className="flex items-center gap-2">
				<Button
					onClick={handleCommit}
					disabled={!commitMessage.trim() || !hasStagedChanges || isCommitting}
					className="flex-1"
					size="sm"
				>
					{isCommitting ? (
						<RefreshCw className="w-4 h-4 mr-2 animate-spin" />
					) : (
						<GitCommit className="w-4 h-4 mr-2" />
					)}
					{isCommitting ? 'Committing...' : 'Commit'}
				</Button>
				<Button
					onClick={handleRefresh}
					variant="outline"
					size="sm"
					disabled={isLoading}
					className="px-3"
				>
					<RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
				</Button>
			</div>
		</div>
	);
}

// Staged Files List Component
function StagedFilesList({ repoPath }: { repoPath: string }) {
	const { unstageAllFiles, unstageFile, isLoading, gitStatus } = getStagingState(repoPath);
	const files = gitStatus.value?.stagedFiles ?? [];

	return (
		<FileListSection
			title="Staged Changes"
			icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
			files={files}
			fileType="staged"
			action="unstage"
			onFileAction={unstageFile}
			onBulkAction={unstageAllFiles}
			isLoading={isLoading}
			repoPath={repoPath}
		/>
	);
}

// Unstaged Files List Component
function UnstagedFilesList({ repoPath }: { repoPath: string }) {
	const { stageFile, stageAllFiles, isLoading, gitStatus } = getStagingState(repoPath);
	const files = gitStatus.value?.unstagedFiles ?? [];

	return (
		<FileListSection
			title="Changes"
			icon={<AlertCircle className="w-4 h-4 text-amber-600" />}
			files={files}
			fileType="unstaged"
			action="stage"
			onFileAction={stageFile}
			onBulkAction={stageAllFiles}
			isLoading={isLoading}
			repoPath={repoPath}
		/>
	);
}

// Untracked Files List Component
function UntrackedFilesList({ repoPath }: { repoPath: string }) {
	const { gitStatus, stageFile, isLoading } = getStagingState(repoPath);
	const files = gitStatus.value?.untrackedFiles ?? [];

	const handleStageAll = async () => {
		// Stage each untracked file individually
		for (const file of files) {
			await stageFile(file.path);
		}
	};

	return (
		<FileListSection
			title="Untracked Files"
			icon={<FileText className="w-4 h-4 text-blue-600" />}
			files={files}
			fileType="untracked"
			action="stage"
			onFileAction={stageFile}
			onBulkAction={handleStageAll}
			isLoading={isLoading}
			repoPath={repoPath}
		/>
	);
}

// Generic File List Section Component
interface FileListSectionProps {
	title: string;
	icon: React.ReactNode;
	files: git_operations.GitStatusFile[];
	fileType: 'staged' | 'unstaged' | 'untracked';
	action: 'stage' | 'unstage';
	onFileAction: (filePath: string) => Promise<void>;
	onBulkAction: () => Promise<void>;
	isLoading: boolean;
	repoPath: string;
}

function FileListSection({
	title,
	icon,
	files,
	fileType,
	action,
	onFileAction,
	onBulkAction,
	isLoading,
	repoPath,
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
			<span
				className={cn(
					'text-xs font-mono rounded px-1 py-0 font-medium',
					colorMap[status] || colorMap['?']
				)}
			>
				{status}
			</span>
		);
	};

	const openFileInDiff = async (file: git_operations.GitStatusFile, fileType: string) => {
		try {
			Logger.info(`Creating staging diff session for: ${file.path} (${fileType})`, 'StagingPage');

			// Create staging diff session
			const diffInfo = await CreateStagingDiffSession(repoPath, file.path, fileType);

			// Create FileInfo for the diff viewer with the temporary file paths
			const fileInfo: git_operations.FileInfo = {
				Name: file.path.split('/').pop() || file.path,
				Path: file.path,
				Extension: file.path.split('.').pop() || '',
				LeftDirAbsPath: diffInfo.leftPath,
				RightDirAbsPath: diffInfo.rightPath,
			};

			const tabKey = `staging-${fileType}-${file.path}`;
			const tab: TabProps = {
				tabKey,
				titleRender: () => (
					<span className="flex items-center gap-1.5">
						{getStatusBadge(file)}
						{fileInfo.Name}
						<span className="text-xs text-muted-foreground">
							({diffInfo.leftLabel} → {diffInfo.rightLabel})
						</span>
					</span>
				),
				component: <FileDiffView file={fileInfo} />,
				isPermanentlyOpen: false,
				onTabClose: () => {
					// Cleanup staging diff session when tab is closed
					CleanupStagingDiffSession(diffInfo.sessionId).catch((error) => {
						Logger.error(`Failed to cleanup staging diff session: ${error}`, 'StagingPage');
					});
				},
			};

			fileTabsHandlers.openTab(tab);
			Logger.info(`Opened staging diff for: ${file.path}`, 'StagingPage');
		} catch (error) {
			Logger.error(`Failed to open staging diff for ${file.path}: ${error}`, 'StagingPage');
		}
	};

	return (
		<div className="py-3 px-4">
			<div className="flex items-center justify-between mb-1">
				<h3 className="text-sm font-medium flex items-center gap-2 truncate">
					{icon}
					{title}
					<span className="text-xs text-muted-foreground font-normal">({files.length})</span>
				</h3>
				{files.length > 0 && (
					<Button
						onClick={onBulkAction}
						variant="ghost"
						size="sm"
						disabled={isLoading}
						className="h-7 px-2 text-xs hover:bg-accent"
					>
						{action === 'stage' ? (
							<Plus className="w-3.5 h-3.5 mr-1" />
						) : (
							<Minus className="w-3.5 h-3.5 mr-1" />
						)}
						{action === 'stage' ? 'Stage All' : 'Unstage All'}
					</Button>
				)}
			</div>

			<div className="space-y-0">
				{files.map((file) => {
					const fileName = file.path.split('/').pop() || file.path;
					const dirPath = file.path.includes('/')
						? file.path.substring(0, file.path.lastIndexOf('/'))
						: '';

					return (
						<div
							key={file.path}
							className="group flex items-center gap-1.5 py-1 px-1 rounded hover:bg-accent/60 cursor-pointer transition-colors border border-transparent hover:border-border/40"
							onClick={() => openFileInDiff(file, fileType)}
						>
							{getStatusBadge(file)}

							<div className="flex-1 min-w-0 flex items-center gap-1.5">
								<span className="text-sm font-medium whitespace-nowrap" title={file.path}>
									{fileName}
								</span>
								{dirPath && (
									<span
										className="text-xs text-muted-foreground/70 truncate"
										title={file.path}
									>
										{dirPath}
									</span>
								)}
							</div>

							{file.oldPath && (
								<span className="text-xs text-muted-foreground/60 italic shrink-0">
									renamed from {file.oldPath.split('/').pop()}
								</span>
							)}

							<Button
								onClick={(e) => {
									e.stopPropagation();
									onFileAction(file.path);
								}}
								variant="ghost"
								size="sm"
								disabled={isLoading}
								className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
							>
								{action === 'stage' ? (
									<Plus className="w-2.5 h-2.5" />
								) : (
									<Minus className="w-2.5 h-2.5" />
								)}
							</Button>
						</div>
					);
				})}
			</div>
		</div>
	);
}
