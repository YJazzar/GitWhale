import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import FileDiffView from '@/components/file-diff-view';
import { FileTabs } from '@/components/file-tabs/file-tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CommitTextarea } from '@/components/ui/commit-textarea';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGitStagingState } from '@/hooks/state/repo/use-git-staging-state';
import { useRepoStageWatcher } from '@/hooks/state/repo/use-repo-stage-watcher';
import {
	FileTabsSessionKeyGenerator,
	TabProps,
	useFileTabsHandlers,
} from '@/hooks/state/useFileTabsHandlers';
import { usePersistentPanelSizes } from '@/hooks/use-persistent-panel-sizes';
import { useRefreshOnFocus } from '@/hooks/utils/use-refresh-on-focus';
import { useKeyboardHotkeyDisplay, useKeyboardShortcut } from '@/hooks/utils/use-keyboard-shortcut';
import { cn } from '@/lib/utils';
import Logger from '@/utils/logger';
import {
	AlertCircle,
	CheckCircle2,
	Circle,
	CornerDownLeft,
	CornerDownRight,
	FileText,
	GitBranch,
	GitCommit,
	LayoutList,
	Minus,
	Plus,
	RefreshCw,
	Scan,
	Sparkles,
	Undo2,
} from 'lucide-react';
import {
	CleanupStagingDiffSession,
	CreateStagingDiffSession,
} from '../../../wailsjs/go/backend/App';
import { git_operations } from '../../../wailsjs/go/models';
import { DiffFileListItem, DiffStatusBadge } from '@/components/git-diff/diff-file-list-item';
import { getDirNameFromPath, getNameFromPath } from '@/utils/filePathUtils';

export type StagingFileType = 'staged' | 'unstaged' | 'untracked';

export type DiffSource = 'staged' | 'working';

interface StagingTabMeta extends Record<string, unknown> {
	repoPath: string;
	filePath: string;
	fileType: StagingFileType;
	diffSource: DiffSource;
	sessionId: string;
	fileInfo: git_operations.FileInfo;
	gitFile: git_operations.GitStatusFile;
	status: string;
}

interface BuildStagingTabParams {
	repoPath: string;
	gitFile: git_operations.GitStatusFile;
	fileInfo: git_operations.FileInfo;
	diffInfo: git_operations.StagingDiffInfo;
	fileType: StagingFileType;
	status: string;
}

const diffSourceForFileType = (fileType: StagingFileType): DiffSource =>
	fileType === 'staged' ? 'staged' : 'working';

function createFileInfoFromDiff(
	gitFile: git_operations.GitStatusFile,
	diffInfo: git_operations.StagingDiffInfo
): git_operations.FileInfo {
	return {
		Name: gitFile.path.split('/').pop() || gitFile.path,
		Path: gitFile.path,
		Extension: gitFile.path.split('.').pop() || '',
		LeftDirAbsPath: diffInfo.leftPath,
		RightDirAbsPath: diffInfo.rightPath,
	};
}

function buildStagingTab({
	repoPath,
	gitFile,
	fileInfo,
	diffInfo,
	fileType,
	status,
}: BuildStagingTabParams): TabProps {
	const diffSource = diffSourceForFileType(fileType);
	const meta: StagingTabMeta = {
		repoPath,
		filePath: gitFile.path,
		fileType,
		diffSource,
		sessionId: diffInfo.sessionId,
		fileInfo,
		gitFile,
		status,
	};

	const tabKey = `staging-${fileType}-${gitFile.path}`;

	return {
		tabKey,
		titleRender: () => (
			<span className="flex items-center gap-1.5">
				<DiffStatusBadge status={status} />
				{fileInfo.Name}
				<span className="text-xs text-muted-foreground">
					{`${diffInfo.leftLabel} -> ${diffInfo.rightLabel}`}
				</span>
			</span>
		),
		component: <FileDiffView key={diffInfo.sessionId} file={fileInfo} />,
		meta,
		onTabClose: () => {
			CleanupStagingDiffSession(diffInfo.sessionId).catch((error) => {
				Logger.error(`Failed to cleanup staging diff session: ${error}`, 'RepoActiveDiffPage');
			});
		},
	};
}

interface RepoActiveDiffPageProps {
	repoPath: string;
}

export default function RepoActiveDiffPage({ repoPath }: RepoActiveDiffPageProps) {
	const {
		gitStatusData,
		stateFlags,
		actions,
		commitMessage,
	} = useGitStagingState(repoPath);

	const [panelSizes, setPanelSizes] = usePersistentPanelSizes('gitwhale-staging-panel-sizes', [36, 64]);
	const queryClient = useQueryClient();

	const fileTabSessionKey = FileTabsSessionKeyGenerator.stagingArea(repoPath);
	const fileTabsHandlers = useFileTabsHandlers(fileTabSessionKey, { initialTabs: [] });

	useRefreshOnFocus(actions.refresh);

	useRepoStageWatcher(
		repoPath,
		useCallback(() => {
			actions.refresh();
		}, [actions])
	);

	useEffect(() => {
		actions.processNextAction();
	}, [actions, stateFlags]);

	useEffect(() => {
		if (!stateFlags.shouldTriggerAutoRefresh) {
			return;
		}
		actions.refresh();
	}, [actions, stateFlags.shouldTriggerAutoRefresh]);

	const refreshOpenDiffTabs = useCallback(async () => {
		const openTabs = fileTabsHandlers.openTabs;
		if (!openTabs.length) {
			return;
		}

		await Promise.all(
			openTabs.map(async (tab) => {
				const meta = tab.meta as StagingTabMeta | undefined;
				if (!meta) {
					return;
				}

				const matchingGitFile =
					gitStatusData &&
					[...gitStatusData.stagedFiles, ...gitStatusData.unstagedFiles, ...gitStatusData.untrackedFiles].find(
						(candidate) => candidate.path === meta.filePath
					);

				try {
					const diffInfo = await CreateStagingDiffSession(repoPath, meta.filePath, meta.fileType);
					const updatedFileInfo = createFileInfoFromDiff(matchingGitFile ?? meta.gitFile, diffInfo);
					const updatedStatus =
						matchingGitFile?.stagedStatus !== ' '
							? matchingGitFile?.stagedStatus ?? meta.status
							: matchingGitFile?.workingStatus ?? meta.status;

					const updatedMeta: StagingTabMeta = {
						...meta,
						sessionId: diffInfo.sessionId,
						fileInfo: updatedFileInfo,
						gitFile: matchingGitFile ?? meta.gitFile,
						status: updatedStatus ?? meta.status,
					};

					await CleanupStagingDiffSession(meta.sessionId).catch((error) => {
						Logger.warning(`Failed to cleanup stale diff session: ${error}`, 'RepoActiveDiffPage');
					});

					fileTabsHandlers.updateTab(tab.tabKey, () => ({
						...tab,
						component: <FileDiffView key={diffInfo.sessionId} file={updatedFileInfo} />,
						meta: updatedMeta,
						onTabClose: () => {
							CleanupStagingDiffSession(updatedMeta.sessionId).catch((error) => {
								Logger.error(`Failed to cleanup staging diff session: ${error}`, 'RepoActiveDiffPage');
							});
						},
					}));
				} catch (error) {
					Logger.error(`Failed to refresh diff session for ${meta.filePath}: ${error}`, 'RepoActiveDiffPage');
				}
			})
		);
	}, [fileTabsHandlers, gitStatusData, repoPath]);

	useEffect(() => {
		refreshOpenDiffTabs();
	}, [refreshOpenDiffTabs]);

	const gotoNextTab = useCallback(() => {
		const { openTabs, activeTabKey } = fileTabsHandlers;
		if (!openTabs.length) {
			return;
		}

		const currentIndex = openTabs.findIndex((tab) => tab.tabKey === activeTabKey);
		const nextIndex = (currentIndex + 1) % openTabs.length;
		fileTabsHandlers.switchToTab(openTabs[nextIndex].tabKey);
	}, [fileTabsHandlers]);

	const gotoPreviousTab = useCallback(() => {
		const { openTabs, activeTabKey } = fileTabsHandlers;
		if (!openTabs.length) {
			return;
		}
		const currentIndex = openTabs.findIndex((tab) => tab.tabKey === activeTabKey);
		const prevIndex = (currentIndex - 1 + openTabs.length) % openTabs.length;
		fileTabsHandlers.switchToTab(openTabs[prevIndex].tabKey);
	}, [fileTabsHandlers]);

	useKeyboardShortcut(']', gotoNextTab);
	useKeyboardShortcut('[', gotoPreviousTab);

	const handleLayoutChange = (sizes: number[]) => {
		if (sizes.length === 2) {
			setPanelSizes(sizes);
		}
	};

	const handleRefresh = useCallback(() => {
		actions.refresh();
	}, [actions]);

	const stagedCount = gitStatusData?.stagedFiles.length ?? 0;
	const unstagedCount = gitStatusData?.unstagedFiles.length ?? 0;
	const untrackedCount = gitStatusData?.untrackedFiles.length ?? 0;

	return (
		<div className="flex h-full w-full flex-col">
			<ResizablePanelGroup direction="horizontal" onLayout={handleLayoutChange} className="flex-1">
				<ResizablePanel id="staging-sidebar" defaultSize={panelSizes[0]} minSize={18}>
					<div className="flex h-full flex-col border-r">
						<StagingWorkbench
							repoPath={repoPath}
							gitStatusData={gitStatusData}
							stateFlags={stateFlags}
							actions={actions}
							onOpenDiff={async (gitFile, fileType) => {
								try {
									const diffInfo = await CreateStagingDiffSession(repoPath, gitFile.path, fileType);
									const fileInfo = createFileInfoFromDiff(gitFile, diffInfo);
									const status =
										gitFile.stagedStatus !== ' ' ? gitFile.stagedStatus : gitFile.workingStatus;
									const tab = buildStagingTab({
										repoPath,
										gitFile,
										fileInfo,
										diffInfo,
										fileType,
										status: status || '?',
									});
									fileTabsHandlers.openTab(tab);
									refreshOpenDiffTabs();
								} catch (error) {
									Logger.error(`Failed to open diff for ${gitFile.path}: ${error}`, 'RepoActiveDiffPage');
								}
							}}
							onStageAll={actions.stageAllFiles}
							onUnstageAll={actions.unstageAllFiles}
							onRefresh={handleRefresh}
							selectedCounts={{ stagedCount, unstagedCount, untrackedCount }}
							refreshOpenDiffTabs={refreshOpenDiffTabs}
							queryClient={queryClient}
						/>

						<Separator className="my-2" />

						<CommitForm
							repoPath={repoPath}
							commitMessage={commitMessage}
							stateFlags={stateFlags}
							onCommit={() => {
								actions.commitChanges();
							}}
							onRefresh={handleRefresh}
						/>
					</div>
				</ResizablePanel>

				<ResizableHandle withHandle />

				<ResizablePanel id="diff-viewer" defaultSize={panelSizes[1]} minSize={28}>
					<div className="flex h-full flex-col">
						<div className="flex items-center justify-between border-b px-3 py-2">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<GitCommit className="h-4 w-4" />
								<span>
									{stagedCount} staged • {unstagedCount} unstaged • {untrackedCount} untracked
								</span>
							</div>

							<div className="flex items-center gap-2">
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button variant="ghost" size="sm" onClick={gotoPreviousTab} disabled={!fileTabsHandlers.openTabs.length}>
												<CornerDownLeft className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent side="bottom">Previous diff ([)</TooltipContent>
									</Tooltip>
								</TooltipProvider>

								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button variant="ghost" size="sm" onClick={gotoNextTab} disabled={!fileTabsHandlers.openTabs.length}>
												<CornerDownRight className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent side="bottom">Next diff (])</TooltipContent>
									</Tooltip>
								</TooltipProvider>

								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="outline"
												size="sm"
												onClick={handleRefresh}
												disabled={stateFlags.isLoading}
											>
												<RefreshCw
													className={cn(
														'h-4 w-4',
														stateFlags.isLoading && 'animate-spin text-primary'
													)}
												/>
											</Button>
										</TooltipTrigger>
										<TooltipContent side="bottom">
											Refresh ({useKeyboardHotkeyDisplay('r')})
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
						</div>

						<div className="flex-1 overflow-hidden">
							<FileTabs
								fileTabManageSessionKey={fileTabSessionKey}
								initialTabs={[]}
							/>
						</div>
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}

interface StagingWorkbenchProps {
	repoPath: string;
	gitStatusData: git_operations.GitStatus | undefined;
	stateFlags: ReturnType<typeof useGitStagingState>['stateFlags'];
	actions: ReturnType<typeof useGitStagingState>['actions'];
	onOpenDiff: (gitFile: git_operations.GitStatusFile, fileType: StagingFileType) => Promise<void>;
	onStageAll: () => void;
	onUnstageAll: () => void;
	onRefresh: () => void;
	selectedCounts: {
		stagedCount: number;
		unstagedCount: number;
		untrackedCount: number;
	};
	refreshOpenDiffTabs: () => void;
	queryClient: ReturnType<typeof useQueryClient>;
}

function StagingWorkbench({
	repoPath,
	gitStatusData,
	stateFlags,
	actions,
	onOpenDiff,
	onStageAll,
	onUnstageAll,
	onRefresh,
	selectedCounts,
	refreshOpenDiffTabs,
	queryClient,
}: StagingWorkbenchProps) {
	const stagedFiles = gitStatusData?.stagedFiles ?? [];
	const unstagedFiles = gitStatusData?.unstagedFiles ?? [];
	const untrackedFiles = gitStatusData?.untrackedFiles ?? [];

	const badges = useMemo(
		() => [
			{ label: 'Staged', count: selectedCounts.stagedCount, tone: 'bg-emerald-500/10 text-emerald-500' },
			{ label: 'Unstaged', count: selectedCounts.unstagedCount, tone: 'bg-amber-500/10 text-amber-500' },
			{ label: 'Untracked', count: selectedCounts.untrackedCount, tone: 'bg-sky-500/10 text-sky-500' },
		],
		[selectedCounts]
	);

	return (
		<div className="flex-1 overflow-hidden">
			<div className="flex items-center justify-between px-4 py-3">
				<div className="flex items-center gap-2 text-sm font-medium">
					<GitBranch className="h-4 w-4 text-primary" />
					<span>Staging Workbench</span>
				</div>
				<div className="flex items-center gap-2">
					{badges.map((badge) => (
						<Badge key={badge.label} variant="outline" className={cn('gap-1', badge.tone)}>
							{badge.label}
							<span className="font-semibold">{badge.count}</span>
						</Badge>
					))}
				</div>
			</div>

		<div className="flex items-center gap-2 px-4 pb-3">
				<Button variant="outline" size="sm" onClick={onStageAll} disabled={stateFlags.isLoading}>
					<Sparkles className="mr-2 h-4 w-4" />
					Stage everything
				</Button>
				<Button variant="ghost" size="sm" onClick={onUnstageAll} disabled={stateFlags.isLoading}>
					<Scan className="mr-2 h-4 w-4" />
					Sweep staged
				</Button>
				<Button variant="ghost" size="sm" onClick={onRefresh} disabled={stateFlags.isLoading}>
					<RefreshCw
						className={cn('mr-2 h-4 w-4', stateFlags.isLoading && 'animate-spin text-primary')}
					/>
					Sync
				</Button>
			</div>

			<ScrollArea className="h-full px-4 pb-4">
				<div className="space-y-4">
					<FileListSection
						repoPath={repoPath}
						title="Staged changes"
						icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
						files={stagedFiles}
						fileType="staged"
						actionLabel="Unstage"
						onFileAction={actions.unstageFile}
						onOpenDiff={onOpenDiff}
						actions={actions}
						stateFlags={stateFlags}
						refreshOpenDiffTabs={refreshOpenDiffTabs}
						queryClient={queryClient}
					/>

					<FileListSection
						repoPath={repoPath}
						title="Changes"
						icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
						files={unstagedFiles}
						fileType="unstaged"
						actionLabel="Stage"
						onFileAction={actions.stageFile}
						onOpenDiff={onOpenDiff}
						actions={actions}
						stateFlags={stateFlags}
						refreshOpenDiffTabs={refreshOpenDiffTabs}
						queryClient={queryClient}
					/>

					<FileListSection
						repoPath={repoPath}
						title="Untracked"
						icon={<FileText className="h-4 w-4 text-sky-500" />}
						files={untrackedFiles}
						fileType="untracked"
						actionLabel="Stage"
						onFileAction={actions.stageFile}
						onOpenDiff={onOpenDiff}
						actions={actions}
						stateFlags={stateFlags}
						refreshOpenDiffTabs={refreshOpenDiffTabs}
						queryClient={queryClient}
					/>
				</div>
			</ScrollArea>
		</div>
	);
}

interface FileListSectionProps {
	repoPath: string;
	title: string;
	icon: React.ReactNode;
	files: git_operations.GitStatusFile[];
	fileType: StagingFileType;
	actionLabel: string;
	onFileAction: (filePath: string) => void;
	onOpenDiff: (gitFile: git_operations.GitStatusFile, fileType: StagingFileType) => Promise<void>;
	actions: ReturnType<typeof useGitStagingState>['actions'];
	stateFlags: ReturnType<typeof useGitStagingState>['stateFlags'];
	refreshOpenDiffTabs: () => void;
	queryClient: ReturnType<typeof useQueryClient>;
}

function FileListSection({
	repoPath,
	title,
	icon,
	files,
	fileType,
	actionLabel,
	onFileAction,
	onOpenDiff,
	actions,
	stateFlags,
	refreshOpenDiffTabs,
	queryClient,
}: FileListSectionProps) {
	const [expandedFile, setExpandedFile] = useState<string | null>(null);
	const [selectedHunks, setSelectedHunks] = useState<Map<string, Set<string>>>(new Map());

	const toggleHunkSelection = useCallback((filePath: string, hunkID: string, checked: boolean) => {
		setSelectedHunks((prev) => {
			const next = new Map(prev);
			const current = new Set(next.get(filePath) ?? []);
			if (checked) {
				current.add(hunkID);
			} else {
				current.delete(hunkID);
			}
			if (current.size === 0) {
				next.delete(filePath);
			} else {
				next.set(filePath, current);
			}
			return next;
		});
	}, []);

	const clearSelection = useCallback((filePath: string) => {
		setSelectedHunks((prev) => {
			const next = new Map(prev);
			next.delete(filePath);
			return next;
		});
	}, []);

	const selectedForFile = useCallback(
		(filePath: string) => Array.from(selectedHunks.get(filePath) ?? []),
		[selectedHunks]
	);

	const mutateSelectedHunks = useCallback(
		(filePath: string, newIDs: string[]) => {
			setSelectedHunks((prev) => {
				const next = new Map(prev);
				if (newIDs.length === 0) {
					next.delete(filePath);
				} else {
					next.set(filePath, new Set(newIDs));
				}
				return next;
			});
		},
		[]
	);

	const hasFiles = files.length > 0;

	return (
		<div className="space-y-2 rounded-lg border bg-muted/20 p-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="flex h-6 w-6 items-center justify-center rounded-full bg-background shadow-sm">
						{icon}
					</span>
					<h3 className="text-sm font-semibold">
						{title}
						<span className="ml-2 text-xs font-medium text-muted-foreground">({files.length})</span>
					</h3>
				</div>
				{hasFiles && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							if (fileType === 'staged') {
								actions.unstageAllFiles();
							} else {
								actions.stageAllFiles();
							}
						}}
					>
						{fileType === 'staged' ? (
							<>
								<Scan className="mr-2 h-3.5 w-3.5" />
								Unstage all
							</>
						) : (
							<>
								<Sparkles className="mr-2 h-3.5 w-3.5" />
								Stage all
							</>
						)}
					</Button>
				)}
			</div>

			{!hasFiles && (
				<div className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/30 bg-muted/10 px-3 py-6 text-xs text-muted-foreground">
					<Circle className="h-3 w-3 animate-pulse text-muted-foreground/40" />
					<p>No files in this section</p>
				</div>
			)}

			{files.map((file) => {
            const fileKey = file.path;
            const isExpanded = expandedFile === fileKey;

            return (
                <FileListRow
                    key={fileKey}
                    repoPath={repoPath}
                    file={file}
                    fileType={fileType}
                    isExpanded=		{isExpanded }
                    onToggleExpand={() => setExpandedFile(isExpanded ? null : fileKey)}
                    onFileAction={() => onFileAction(fileKey)}
                    onOpenDiff={() => onOpenDiff(file, fileType)}
                    selectedHunkIDs={selectedForFile(fileKey)}
                    onToggleHunk={(hunkID, checked) => toggleHunkSelection(fileKey, hunkID, checked)}
                    onSelectAll={(ids) => mutateSelectedHunks(fileKey, ids)}
                    clearSelection={() => clearSelection(fileKey)}
                    actionLabel={actionLabel}
                    actions={actions}
                    stateFlags={stateFlags}
                    refreshOpenDiffTabs={refreshOpenDiffTabs}
                    queryClient={queryClient}
                />
            );
        })}
		</div>
	);
}

interface FileListRowProps {
	repoPath: string;
	file: git_operations.GitStatusFile;
	fileType: StagingFileType;
	isExpanded: boolean;
	onToggleExpand: () => void;
	onFileAction: () => void;
	onOpenDiff: () => Promise<void>;
	selectedHunkIDs: string[];
	onToggleHunk: (hunkID: string, checked: boolean) => void;
	onSelectAll: (hunkIDs: string[]) => void;
	clearSelection: () => void;
	actionLabel: string;
	actions: ReturnType<typeof useGitStagingState>['actions'];
	stateFlags: ReturnType<typeof useGitStagingState>['stateFlags'];
	refreshOpenDiffTabs: () => void;
	queryClient: ReturnType<typeof useQueryClient>;
}

function FileListRow({
	repoPath,
	file,
	fileType,
	isExpanded,
	onToggleExpand,
	onFileAction,
	onOpenDiff,
	selectedHunkIDs,
	onToggleHunk,
	onSelectAll,
	clearSelection,
	actionLabel,
	actions,
	stateFlags,
	refreshOpenDiffTabs,
	queryClient,
}: FileListRowProps) {
	const status = file.stagedStatus !== " " ? file.stagedStatus : file.workingStatus;
	const fileName = getNameFromPath(file.path);
	const dirPath = getDirNameFromPath(file.path);
	const diffSource = diffSourceForFileType(fileType);

	const hunkQuery = useQuery(
		['staging-hunks', repoPath, file.path, diffSource],
		() => actions.loadDiffPatch(file.path, diffSource),
		{
			enabled: isExpanded,
			staleTime: 5_000,
		}
	);

	const diffPatch = hunkQuery.data ?? null;

	const handleHunkAction = useCallback(
		async (mode: 'stage' | 'unstage' | 'revert') => {
			if (!selectedHunkIDs.length) {
				Logger.info('Select at least one hunk', 'RepoActiveDiffPage');
				return;
			}

			try {
				if (mode === 'stage') {
					await actions.stageHunks(file.path, selectedHunkIDs);
				} else if (mode === 'unstage') {
					await actions.unstageHunks(file.path, selectedHunkIDs);
				} else {
					await actions.revertHunks(file.path, selectedHunkIDs);
				}
				Logger.info(`Applied ${mode} for ${selectedHunkIDs.length} hunks`, 'RepoActiveDiffPage');
				clearSelection();
				await actions.refresh();
				refreshOpenDiffTabs();
				queryClient.invalidateQueries(['staging-hunks', repoPath, file.path, diffSource]);
			} catch (error) {
				Logger.error(`Failed to ${mode} hunks for ${file.path}: ${error}`, 'RepoActiveDiffPage');
			}
		},
		[
			actions,
			clearSelection,
			diffSource,
			file.path,
			queryClient,
			refreshOpenDiffTabs,
			repoPath,
			selectedHunkIDs,
		]
	);

	const actionButtons = (
		<div className="flex items-center gap-1">
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className={cn('h-7 w-7', isExpanded && 'bg-primary/10 text-primary')}
							onClick={(event) => {
								event.stopPropagation();
								onToggleExpand();
							}}
						>
							<LayoutList className="h-3.5 w-3.5" />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="bottom">{isExpanded ? 'Hide hunks' : 'Show hunks'}</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7"
				onClick={(event) => {
					event.stopPropagation();
					onFileAction();
				}}
				disabled={stateFlags.isLoading}
			>
				{actionLabel === 'Stage' ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
			</Button>
		</div>
	);

	return (
		<div className="rounded-md border border-border/40 bg-background shadow-sm">
			<DiffFileListItem
				status={status}
				primaryText={fileName}
				secondaryText={dirPath || undefined}
				tertiaryText={
					file.oldPath ? (
						<span className="italic text-xs text-muted-foreground/70">
							renamed from {file.oldPath.split('/').pop()}
						</span>
					) : undefined
				}
				title={file.path}
				onClick={() => {
					void onOpenDiff();
				}}
				actionSlot={actionButtons}
			/>

			{isExpanded && (
				<div className="border-t bg-muted/10">
					<HunkList
						filePath={file.path}
						fileType={fileType}
						diffPatch={diffPatch}
						isLoading={hunkQuery.isLoading}
						selectedHunkIDs={selectedHunkIDs}
						onToggle={onToggleHunk}
						onStageSelected={() => handleHunkAction('stage')}
						onUnstageSelected={() => handleHunkAction('unstage')}
						onRevertSelected={() => handleHunkAction('revert')}
						onSelectAll={onSelectAll}
					/>
				</div>
			)}
		</div>
	);
}

interface HunkListProps {
	filePath: string;
	fileType: StagingFileType;
	diffPatch: git_operations.FileDiffPatch | null;
	isLoading: boolean;
	selectedHunkIDs: string[];
	onToggle: (hunkID: string, checked: boolean) => void;
	onStageSelected: () => void;
	onUnstageSelected: () => void;
	onRevertSelected: () => void;
	onSelectAll: (hunkIDs: string[]) => void;
}

function HunkList({
	filePath,
	fileType,
	diffPatch,
	isLoading,
	selectedHunkIDs,
	onToggle,
	onStageSelected,
	onUnstageSelected,
	onRevertSelected,
	onSelectAll,
}: HunkListProps) {
	if (isLoading) {
		return (
			<div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
				<RefreshCw className="h-3 w-3 animate-spin" />
				Loading hunks�
			</div>
		);
	}

	if (!diffPatch) {
		return (
			<div className="px-3 py-4 text-xs text-muted-foreground">No diff information available.</div>
		);
	}

	if (diffPatch.isBinary) {
		return (
			<div className="px-3 py-4 text-xs text-muted-foreground">
				Binary file � stage or unstage via file-level actions.
			</div>
		);
	}

	const hunks = diffPatch.hunks ?? [];
	const hasSelection = selectedHunkIDs.length > 0;

	return (
		<div className="space-y-3 p-3">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span className="font-medium text-foreground">Hunks</span>
					<span>•</span>
					<span>{hunks.length} total</span>
					<span>•</span>
					<span>{selectedHunkIDs.length} selected</span>
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						className="h-7 px-2 text-xs"
						onClick={() => onSelectAll(hunks.map((hunk) => hunk.id))}
					>
						Select all
					</Button>
					<Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onSelectAll([])}>
						Clear
					</Button>
				</div>
			</div>

			<div className="space-y-2">
				{hunks.map((hunk) => {
					const isSelected = selectedHunkIDs.includes(hunk.id);
					return (
						<div
							key={hunk.id}
							className={cn(
								'rounded-md border border-border/30 bg-background/70 p-3 shadow-sm transition-colors',
								isSelected && 'border-primary/60 bg-primary/5'
							)}
						>
							<div className="flex items-start justify-between gap-3">
								<div className="flex items-center gap-2">
									<Checkbox
										id={`${filePath}-hunk-${hunk.id}`}
										checked={isSelected}
										onCheckedChange={(checked) =>
										onToggle(hunk.id, Boolean(checked))
									}
								/>
									<label
										htmlFor={`${filePath}-hunk-${hunk.id}`}
										className="font-mono text-xs text-muted-foreground"
									>
										{hunk.header}
									</label>
								</div>
								<div className="flex items-center gap-2 text-[10px]">
									<Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">
										+{hunk.addedLines}
									</Badge>
									<Badge variant="outline" className="bg-rose-500/10 text-rose-500">
										-{hunk.removedLines}
									</Badge>
								</div>
							</div>

							<pre className="mt-3 max-h-48 overflow-auto rounded-md bg-muted/30 p-3 text-[11px] leading-5">
								{hunk.preview || hunk.patch}
							</pre>
						</div>
					);
				})}
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{fileType === 'staged' ? (
					<Button
						variant="outline"
						size="sm"
						disabled={!hasSelection}
						onClick={onUnstageSelected}
					>
						<Minus className="mr-2 h-3.5 w-3.5" />
						Unstage selected
					</Button>
				) : (
					<Button
						variant="default"
						size="sm"
						disabled={!hasSelection}
						onClick={onStageSelected}
					>
						<Plus className="mr-2 h-3.5 w-3.5" />
						Stage selected
					</Button>
				)}

				{fileType !== 'staged' && (
					<Button
						variant="ghost"
						size="sm"
						disabled={!hasSelection}
						onClick={onRevertSelected}
					>
						<Undo2 className="mr-2 h-3.5 w-3.5" />
						Revert selected
					</Button>
				)}
			</div>
		</div>
	);
}

interface CommitFormProps {
	repoPath: string;
	commitMessage: ReturnType<typeof useGitStagingState>['commitMessage'];
	stateFlags: ReturnType<typeof useGitStagingState>['stateFlags'];
	onCommit: () => void;
	onRefresh: () => void;
}

function CommitForm({ commitMessage, stateFlags, onCommit, onRefresh }: CommitFormProps) {
	const commitShortcut = useKeyboardHotkeyDisplay('Enter');
	const rewrapShortcut = useKeyboardHotkeyDisplay('t');
	const refreshShortcut = useKeyboardHotkeyDisplay('r');

	const disableCommit =
		!commitMessage.value?.trim() || !stateFlags.hasStagedChanges || stateFlags.isCommittingChanges;

	useKeyboardShortcut('Enter', () => {
		if (!disableCommit) {
			onCommit();
		}
	});

	return (
		<div className="space-y-3 px-4 pb-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-sm font-medium">
					<GitCommit className="h-4 w-4" />
					<span>Commit message</span>
				</div>

				<div className="flex items-center gap-2 text-[11px] text-muted-foreground">
					<span>{rewrapShortcut} wrap</span>
					<span>•</span>
					<span>{commitShortcut} commit</span>
					<span>•</span>
					<span>{refreshShortcut} refresh</span>
				</div>
			</div>

			<CommitTextarea
				value={commitMessage.value ?? ''}
				onChange={(event) => commitMessage.set(event.target.value)}
				placeholder="Describe your changes…"
				disabled={stateFlags.isCommittingChanges}
				className="min-h-[120px]"
			/>

			<div className="flex items-center gap-2">
				<Button
					onClick={() => {
						if (disableCommit) {
							Logger.warning('Nothing staged to commit', 'RepoActiveDiffPage');
							return;
						}
						onCommit();
						commitMessage.set('');
					}}
					className="flex-1"
					size="sm"
					disabled={disableCommit}
				>
					{stateFlags.isCommittingChanges ? (
						<>
							<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
							Committing…
						</>
					) : (
						<>
							<GitCommit className="mr-2 h-4 w-4" />
							Commit staged changes
						</>
					)}
				</Button>

				<Button variant="ghost" size="sm" onClick={onRefresh} disabled={stateFlags.isLoading}>
					<RefreshCw className={cn('h-4 w-4', stateFlags.isLoading && 'animate-spin text-primary')} />
				</Button>
			</div>

			<div className="rounded-md border border-dashed border-muted-foreground/20 bg-muted/10 p-3 text-[11px] text-muted-foreground">
				<p>
					Need fine-grained control? Toggle hunks in the lists above or open a diff tab to review the
					full context.
				</p>
			</div>
		</div>
	);
}
