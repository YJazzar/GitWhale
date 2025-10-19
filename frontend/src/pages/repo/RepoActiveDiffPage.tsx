import FileDiffView from '@/components/file-diff-view';
import { FileTabs } from '@/components/file-tabs/file-tabs';
import { Button } from '@/components/ui/button';
import { CommitTextarea } from '@/components/ui/commit-textarea';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGitStagingState } from '@/hooks/state/repo/use-git-staging-state';
import {
	FileTabsSessionKeyGenerator,
	TabProps,
	useFileTabsHandlers,
} from '@/hooks/state/useFileTabsHandlers';
import { usePersistentPanelSizes } from '@/hooks/use-persistent-panel-sizes';
import { useRefreshOnFocus } from '@/hooks/utils/use-refresh-on-focus';
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
import { CleanupStagingDiffSession, CreateStagingDiffSession } from '../../../wailsjs/go/backend/App';
import { git_operations } from '../../../wailsjs/go/models';
import { useEffect } from 'react';
import { DiffFileListItem, DiffStatusBadge } from '@/components/git-diff/diff-file-list-item';
import { useKeyboardHotkeyDisplay, useKeyboardShortcut } from '@/hooks/utils/use-keyboard-shortcut';
import { getDirNameFromPath, getNameFromPath } from '@/utils/filePathUtils';
import { useDebounce } from '@uidotdev/usehooks';

interface RepoActiveDiffPageProps {
	repoPath: string;
}

export default function RepoActiveDiffPage({ repoPath }: RepoActiveDiffPageProps) {
	const { actions, stateFlags } = useGitStagingState(repoPath);

	// A couple of auto refresh triggers:
	// 1. If the user just came back to the view
	// 2. If the user requested one
	// 3. If the user performed a few operations, and we need make sure the staged file list is in sync with git
	// 		(this is because we prematurely update all the files in the view)
	useRefreshOnFocus(actions.refresh);
	useKeyboardShortcut('r', actions.refresh);
	const shouldTriggerAutoRefresh = useDebounce(stateFlags.shouldTriggerAutoRefresh, 600);
	useEffect(() => {
		if (shouldTriggerAutoRefresh) {
			actions.refresh();
		}
	}, [shouldTriggerAutoRefresh]);

	// Pop from the queue whenever we can
	useEffect(() => {
		actions.processNextAction();
	}, [stateFlags, actions]);

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
		actions.refresh();
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
						{!stateFlags.hasChanges && (
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

						{stateFlags.hasChanges && (
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
	const { gitStatusData } = useGitStagingState(repoPath);

	const stagedFiles = gitStatusData?.stagedFiles ?? [];
	const unstagedFiles = gitStatusData?.unstagedFiles ?? [];
	const untrackedFiles = gitStatusData?.untrackedFiles ?? [];

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
	const { gitStatusData, stateFlags, actions, commitMessage } = useGitStagingState(repoPath);

	const handleCommit = async () => {
		if (!commitMessage.value?.trim()) {
			Logger.error('Commit message cannot be empty', 'StagingPage');
			return;
		}

		await actions.commitChanges();
		commitMessage.set(''); // Clear the message after successful commit
		Logger.info('Successfully committed changes', 'StagingPage');
	};

	useKeyboardShortcut('Enter', handleCommit);
	const commitShortcutDisplay = useKeyboardHotkeyDisplay('Enter');
	const rewrapShortcutDisplay = useKeyboardHotkeyDisplay('T');
	const refreshShortcutDisplay = useKeyboardHotkeyDisplay("R")

	const onCommitMessageChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		commitMessage.set(event.target.value);
	};

	const disableCommitButton =
		!commitMessage.value?.trim() || !stateFlags.hasStagedChanges || stateFlags.isCommittingChanges;

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
									<p>
										{rewrapShortcutDisplay} to rewrap • {commitShortcutDisplay} to commit
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					{stateFlags.hasStagedChanges && (
						<span className="text-xs text-muted-foreground">
							{gitStatusData?.stagedFiles?.length ?? 0} staged
						</span>
					)}
				</div>
				<CommitTextarea
					id="commit-message"
					placeholder="Enter commit message..."
					value={commitMessage.value}
					onChange={onCommitMessageChange}
					className="h-fit"
				/>
			</div>

			<div className="flex items-center gap-2">
				<Button onClick={handleCommit} disabled={disableCommitButton} className="flex-1" size="sm">
					{stateFlags.isCommittingChanges ? (
						<RefreshCw className="w-4 h-4 mr-2 animate-spin" />
					) : (
						<GitCommit className="w-4 h-4 mr-2" />
					)}
					{stateFlags.isCommittingChanges ? 'Committing...' : 'Commit'}
				</Button>

				<TooltipProvider>
					<Tooltip delayDuration={100}>
						<TooltipTrigger asChild>
							<Button
								onClick={actions.refresh}
								variant="outline"
								size="sm"
								disabled={stateFlags.isLoading}
								className="px-3"
							>
								<RefreshCw
									className={cn('w-4 h-4', stateFlags.isLoading && 'animate-spin')}
								/>
							</Button>
						</TooltipTrigger>
						<TooltipContent side="right">
							<p>
								{refreshShortcutDisplay}
							</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</div>
	);
}

// Staged Files List Component
function StagedFilesList({ repoPath }: { repoPath: string }) {
	const { actions, gitStatusData, stateFlags } = useGitStagingState(repoPath);
	const files = gitStatusData?.stagedFiles ?? [];

	return (
		<FileListSection
			title="Staged Changes"
			icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
			files={files}
			fileType="staged"
			action="unstage"
			onFileAction={actions.unstageFile}
			onBulkAction={actions.unstageAllFiles}
			isLoading={stateFlags.isLoading}
			repoPath={repoPath}
		/>
	);
}

// Unstaged Files List Component
function UnstagedFilesList({ repoPath }: { repoPath: string }) {
	const { actions, gitStatusData, stateFlags } = useGitStagingState(repoPath);
	const files = gitStatusData?.unstagedFiles ?? [];

	return (
		<FileListSection
			title="Changes"
			icon={<AlertCircle className="w-4 h-4 text-amber-600" />}
			files={files}
			fileType="unstaged"
			action="stage"
			onFileAction={actions.stageFile}
			onBulkAction={actions.stageAllFiles}
			isLoading={stateFlags.isLoading}
			repoPath={repoPath}
		/>
	);
}

// Untracked Files List Component
function UntrackedFilesList({ repoPath }: { repoPath: string }) {
	const { actions, gitStatusData, stateFlags } = useGitStagingState(repoPath);
	const files = gitStatusData?.untrackedFiles ?? [];

	return (
		<FileListSection
			title="Untracked Files"
			icon={<FileText className="w-4 h-4 text-blue-600" />}
			files={files}
			fileType="untracked"
			action="stage"
			onFileAction={actions.stageFile}
			onBulkAction={actions.stageAllFiles}
			isLoading={stateFlags.isLoading}
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
	onFileAction: (filePath: string) => void;
	onBulkAction: () => void;
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
	repoPath,
}: FileListSectionProps) {
	const fileTabsHandlers = useFileTabsHandlers(FileTabsSessionKeyGenerator.stagingArea(repoPath));

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
			const status = file.stagedStatus !== ' ' ? file.stagedStatus : file.workingStatus;
			const tab: TabProps = {
				tabKey,
				titleRender: () => (
					<span className="flex items-center gap-1.5">
						<DiffStatusBadge status={status} />
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
					const fileName = getNameFromPath(file.path);
					const dirPath = getDirNameFromPath(file.path);
					const status = file.stagedStatus !== ' ' ? file.stagedStatus : file.workingStatus;

					return (
						<DiffFileListItem
							key={file.path}
							status={status}
							primaryText={fileName}
							secondaryText={dirPath || undefined}
							tertiaryText={
								file.oldPath ? (
									<span className="italic">
										renamed from {file.oldPath.split('/').pop()}
									</span>
								) : undefined
							}
							title={file.path}
							onClick={() => openFileInDiff(file, fileType)}
							actionSlot={
								<Button
									onClick={(e) => {
										e.stopPropagation();
										onFileAction(file.path);
									}}
									variant="ghost"
									size="sm"
									className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
								>
									{action === 'stage' ? (
										<Plus className="w-2.5 h-2.5" />
									) : (
										<Minus className="w-2.5 h-2.5" />
									)}
								</Button>
							}
						/>
					);
				})}
			</div>
		</div>
	);
}



