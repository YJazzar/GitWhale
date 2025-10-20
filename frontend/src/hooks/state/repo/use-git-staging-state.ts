import Logger from '@/utils/logger';
import { useCallback, useEffect, useMemo } from 'react';
import {
	CommitChanges,
	EnsureRepoWatcher,
	GetFileDiffPatch,
	GetGitStatus,
	RevertDiffHunks,
	StageDiffHunks,
	StageFile,
	UnstageDiffHunks,
	UnstageFile,
	DisposeRepoWatcher,
} from '../../../../wailsjs/go/backend/App';
import { git_operations } from '../../../../wailsjs/go/models';
import { createMappedAtom, useMapPrimitive } from '../primitives/use-map-primitive';
import { DiffSource } from '@/pages/repo/RepoActiveDiffPage';

type StagingOperation = {
	type:
		| 'stageFiles'
		| 'unstageFiles'
		| 'refresh'
		| 'createCommit'
		| 'stageHunks'
		| 'unstageHunks'
		| 'revertHunks';
	files?: string[];
	commitMessage?: string;
	filePath?: string;
	hunkIDs?: string[];
};

// State atoms for staging data per repository path
const gitStatusAtom = createMappedAtom<git_operations.GitStatus>();
const hasInitialLoadedAtom = createMappedAtom<boolean>();
const commitMessageAtom = createMappedAtom<string>();
const operationsQueueAtom = createMappedAtom<StagingOperation[]>();
const shouldTriggerAutoRefreshAtom = createMappedAtom<boolean>();

export function useGitStagingState(repoPath: string) {
	const _commitMessagePrim = useMapPrimitive(commitMessageAtom, repoPath, '');
	const _gitStatusPrim = useMapPrimitive(gitStatusAtom, repoPath);
	const _operationsQueuePrim = useMapPrimitive(operationsQueueAtom, repoPath);
	const _shouldTriggerAutoRefreshPrim = useMapPrimitive(shouldTriggerAutoRefreshAtom, repoPath);

	useEffect(() => {
		let isActive = true;
		EnsureRepoWatcher(repoPath).catch((error) => {
			Logger.error(`Failed to start repo watcher for ${repoPath}: ${error}`, 'useGitStagingState');
		});

		return () => {
			if (!isActive) {
				return;
			}
			isActive = false;
			DisposeRepoWatcher(repoPath).catch((error) => {
				Logger.warning(`Failed to dispose repo watcher for ${repoPath}: ${error}`, 'useGitStagingState');
			});
		};
	}, [repoPath]);

	const _refreshGitStatus = useCallback(async () => {
		try {
			const status = await GetGitStatus(repoPath);
			_gitStatusPrim.set(status);
			_shouldTriggerAutoRefreshPrim.set(false);
			Logger.warning(`Setting to new status from refresh: ${status}`);
		} catch (error) {
			Logger.error(`Failed to load git status: ${error}`, 'useGitStagingState');
			return undefined;
		}
	}, [_gitStatusPrim.set, _shouldTriggerAutoRefreshPrim.set]);

	const _stageFiles = useCallback(
		async (filePaths: string[]) => {
			try {
				await StageFile(repoPath, filePaths);
				Logger.info(`Successfully staged file: ${filePaths}`, 'useGitStagingState');
			} catch (error) {
				Logger.error(`Failed to stage file ${filePaths}: ${error}`, 'useGitStagingState');
				throw error;
			}
		},
		[repoPath]
	);

	const _unstageFiles = useCallback(
		async (filePaths: string[]) => {
			try {
				await UnstageFile(repoPath, filePaths);
				Logger.info(`Successfully unstaged file: ${filePaths}`, 'useGitStagingState');
			} catch (error) {
				Logger.error(`Failed to unstage file ${filePaths}: ${error}`, 'useGitStagingState');
				throw error;
			}
		},
		[repoPath]
	);

	const _stageHunks = useCallback(
		async (filePath: string, hunkIDs: string[]) => {
			if (!filePath || hunkIDs.length === 0) {
				return;
			}

			try {
				await StageDiffHunks(repoPath, filePath, hunkIDs);
				Logger.debug(
					`Staged ${hunkIDs.length} hunks for ${filePath}`,
					'useGitStagingState::_stageHunks'
				);
			} catch (error) {
				Logger.error(`Failed to stage hunks for ${filePath}: ${error}`, 'useGitStagingState');
				throw error;
			}
		},
		[repoPath]
	);

	const _unstageHunks = useCallback(
		async (filePath: string, hunkIDs: string[]) => {
			if (!filePath || hunkIDs.length === 0) {
				return;
			}

			try {
				await UnstageDiffHunks(repoPath, filePath, hunkIDs);
				Logger.debug(
					`Unstaged ${hunkIDs.length} hunks for ${filePath}`,
					'useGitStagingState::_unstageHunks'
				);
			} catch (error) {
				Logger.error(`Failed to unstage hunks for ${filePath}: ${error}`, 'useGitStagingState');
				throw error;
			}
		},
		[repoPath]
	);

	const _revertHunks = useCallback(
		async (filePath: string, hunkIDs: string[]) => {
			if (!filePath || hunkIDs.length === 0) {
				return;
			}

			try {
				await RevertDiffHunks(repoPath, filePath, hunkIDs);
				Logger.debug(
					`Reverted ${hunkIDs.length} hunks for ${filePath}`,
					'useGitStagingState::_revertHunks'
				);
			} catch (error) {
				Logger.error(`Failed to revert hunks for ${filePath}: ${error}`, 'useGitStagingState');
				throw error;
			}
		},
		[repoPath]
	);

	// const _stageAllFiles = useCallback(async () => {
	// 	const gitStatusData = _gitStatusPrim.value;
	// 	if (!gitStatusData) {
	// 		return;
	// 	}
	// 	const allUnstagedFiles = [...gitStatusData.unstagedFiles, ...gitStatusData.untrackedFiles];
	// 	_stageFiles(allUnstagedFiles.map((file) => file.path));
	// }, [repoPath, _gitStatusPrim.value, _stageFiles]);

	// const _unstageAllFiles = useCallback(async () => {
	// 	const gitStatusData = _gitStatusPrim.value;
	// 	if (!gitStatusData) {
	// 		return;
	// 	}
	// 	const allStagedFiles = gitStatusData.stagedFiles;
	// 	_unstageFiles(allStagedFiles.map((file) => file.path));
	// }, [repoPath, _gitStatusPrim.value, _unstageFiles]);

	const _commitChanges = useCallback(
		async (commitMessage: string | undefined) => {
			if (!commitMessage || commitMessage === '') {
				return;
			}

			try {
				await CommitChanges(repoPath, commitMessage);
				Logger.info(`Successfully committed changes: ${commitMessage}`, 'useGitStagingState');
			} catch (error) {
				Logger.error(`Failed to commit changes: ${error}`, 'useGitStagingState');
				throw error;
			}
		},
		[repoPath]
	);

	const handleGitOperation = useCallback(
		async (operation: StagingOperation) => {
			if (operation.type === 'refresh') {
				await _refreshGitStatus();
				return false;
			}

			switch (operation.type) {
				case 'createCommit':
					await _commitChanges(operation.commitMessage);
					break;
				case 'stageFiles':
					await _stageFiles(operation.files ?? []);
					break;
				case 'unstageFiles':
					await _unstageFiles(operation.files ?? []);
					break;
				case 'stageHunks':
					await _stageHunks(operation.filePath ?? '', operation.hunkIDs ?? []);
					break;
				case 'unstageHunks':
					await _unstageHunks(operation.filePath ?? '', operation.hunkIDs ?? []);
					break;
				case 'revertHunks':
					await _revertHunks(operation.filePath ?? '', operation.hunkIDs ?? []);
					break;
				default:
					Logger.error('Unhandled git operation type in useStagingState()');
			}

			// For any of the "editing" actions, trigger another refresh in the background once we've processed everything
			// to make sure the UI actually shows what git thinks happened
			return true;
		},
		[_refreshGitStatus, _stageFiles, _unstageFiles, _stageHunks, _unstageHunks, _revertHunks, _commitChanges]
	);

	const pushToOperationsQueue = useCallback(
		(newOperation: StagingOperation) => {
			_operationsQueuePrim.set((prevValue) => {
				const unfulfilledOperations = _operationsQueuePrim.value ?? [];
				if (
					newOperation.type === 'refresh' &&
					unfulfilledOperations.length > 0 &&
					unfulfilledOperations[unfulfilledOperations.length - 1].type === 'refresh'
				) {
					Logger.trace('Skipped adding a refresh to the queue');
					return prevValue || [];
				}

				Logger.trace(
					`Pushing git staging operation: ${JSON.stringify(newOperation)}`,
					'useGitStagingState'
				);

				return [...(prevValue ?? []), newOperation];
			});
		},
		[_operationsQueuePrim.set]
	);

	const popFromOperationsQueue = useCallback(async () => {
		const queue = _operationsQueuePrim.value ?? [];
		Logger.trace(`queued operations: ${JSON.stringify(queue, null, 2)}`, 'useGitStagingState');

		if (queue.length === 0) {
			return;
		}

		const nextOperation = queue[0];
		_operationsQueuePrim.set((prevValue) => {
			Logger.info(`Finished popping ${nextOperation.type}`);
			if (!prevValue || prevValue.length === 0) {
				return [];
			}

			const newOperationsQueue = prevValue.slice(1);

			return newOperationsQueue;
		});

		Logger.info(`Popping git staging operation: ${JSON.stringify(nextOperation)}`, 'useGitStagingState');
		const shouldTriggerBackgroundRefresh = await handleGitOperation(nextOperation);

		// If it's recommended (by handleGitOperation) to refresh, which we should only respect after
		// all operations have been executed, then add a new refresh operation to the queue
		if (queue.length === 1 && shouldTriggerBackgroundRefresh) {
			_shouldTriggerAutoRefreshPrim.set(true);
		}
	}, [
		handleGitOperation,
		_operationsQueuePrim.value,
		_operationsQueuePrim.set,
		_shouldTriggerAutoRefreshPrim.set,
	]);

	const prematurelyStageFiles = useCallback(
		(filePaths: string[]) => {
			// Pre-maturely move over the files into the staged files list
			_gitStatusPrim.set((oldData) => {
				const oldStagedFiles = oldData?.stagedFiles || [];
				const oldUnstagedFiles = oldData?.unstagedFiles || [];
				const oldUntrackedFiles = oldData?.untrackedFiles || [];
				const newUntrackedFiles = [
					...oldUntrackedFiles.filter((file) => !filePaths.includes(file.path)),
				];
				const newUnstagedFiles = [
					...oldUnstagedFiles.filter((file) => !filePaths.includes(file.path)),
				];
				const newStagedFiles = [
					...oldStagedFiles,
					...oldUnstagedFiles.filter((file) => filePaths.includes(file.path)),
					...oldUntrackedFiles.filter((file) => filePaths.includes(file.path)),
				];
				return new git_operations.GitStatus({
					...oldData,
					stagedFiles: getUniqueFilesAndSort(newStagedFiles),
					unstagedFiles: getUniqueFilesAndSort(newUnstagedFiles),
					untrackedFiles: getUniqueFilesAndSort(newUntrackedFiles),
				});
			});
		},
		[_gitStatusPrim.set]
	);

	const prematurelyUnstageFiles = useCallback(
		(filePaths: string[]) => {
			// Pre-maturely move over the files into the staged files list
			_gitStatusPrim.set((oldData) => {
				const oldStagedFiles = oldData?.stagedFiles || [];
				const oldUnstagedFiles = oldData?.unstagedFiles || [];
				const oldUntrackedFiles = oldData?.untrackedFiles || [];

				const isNewFileState = (gitFileStatus: string) =>
					gitFileStatus === 'A' || gitFileStatus === '?';

				// Figure out if the file needs to be moved to the tracked/untracked list
				const filesToUnstage = oldStagedFiles.filter((file) => filePaths.includes(file.path));
				const filesToAddToUntracked = filesToUnstage.filter(
					(file) => isNewFileState(file.workingStatus) || isNewFileState(file.stagedStatus)
				);
				const filesToAddToTracked = filesToUnstage.filter(
					(file) => !isNewFileState(file.workingStatus) && !isNewFileState(file.stagedStatus)
				);

				const newStagedFiles = [...oldStagedFiles.filter((file) => !filePaths.includes(file.path))];
				const newUntrackedFiles = [...oldUntrackedFiles, ...filesToAddToUntracked];
				const newUnstagedFiles = [...oldUnstagedFiles, ...filesToAddToTracked];

				return new git_operations.GitStatus({
					...oldData,
					stagedFiles: getUniqueFilesAndSort(newStagedFiles),
					unstagedFiles: getUniqueFilesAndSort(newUnstagedFiles),
					untrackedFiles: getUniqueFilesAndSort(newUntrackedFiles),
				});
			});
		},
		[_gitStatusPrim.set]
	);

	const prematurelyStageAllFiles = useCallback(() => {
		const unstagedFiles = _gitStatusPrim.value?.unstagedFiles || [];
		const untrackedFiles = _gitStatusPrim.value?.untrackedFiles || [];
		const filesToStage = [...unstagedFiles, ...untrackedFiles].map((file) => file.path);
		prematurelyStageFiles(filesToStage);
	}, [_gitStatusPrim.value, prematurelyStageFiles]);

	const prematurelyUnstageAllFiles = useCallback(() => {
		const stagedFiles = _gitStatusPrim.value?.stagedFiles || [];
		const filesToUnstage = stagedFiles.map((file) => file.path);
		prematurelyUnstageFiles(filesToUnstage);
	}, [_gitStatusPrim.value, prematurelyUnstageFiles]);

	const isLoading = (_operationsQueuePrim.value || []).length !== 0;
	const hasChanges = _gitStatusPrim.value?.hasChanges ?? false;
	const hasStagedChanges = (_gitStatusPrim.value?.stagedFiles?.length ?? 0) > 0;
	const isCommittingChanges =
		_operationsQueuePrim.value?.find((op) => op.type === 'createCommit') !== undefined;

	return useMemo(() => {
		return {
			gitStatusData: _gitStatusPrim.value,
			commitMessage: {
				value: _commitMessagePrim.value,
				set: _commitMessagePrim.set,
			},
			stateFlags: {
				isLoading,
				hasChanges,
				hasStagedChanges,
				isCommittingChanges,
				unfulfilledActions: _operationsQueuePrim.value ?? [],
				shouldTriggerAutoRefresh: _shouldTriggerAutoRefreshPrim.value ?? false,
			},

			actions: {
				processNextAction: popFromOperationsQueue,
				stageFile: (filePath: string) => {
					prematurelyStageFiles([filePath]);
					pushToOperationsQueue({ type: 'stageFiles', files: [filePath] });
				},
				stageAllFiles: () => {
					prematurelyStageAllFiles();

					pushToOperationsQueue({
						type: 'stageFiles',
						files: [
							...(_gitStatusPrim.value?.unstagedFiles ?? []),
							...(_gitStatusPrim.value?.untrackedFiles ?? []),
						].map((file) => file.path),
					});
				},
				unstageFile: (filePath: string) => {
					prematurelyUnstageFiles([filePath]);
					pushToOperationsQueue({ type: 'unstageFiles', files: [filePath] });
				},
				unstageAllFiles: () => {
					prematurelyUnstageAllFiles();
					pushToOperationsQueue({
						type: 'unstageFiles',
						files: [...(_gitStatusPrim.value?.stagedFiles ?? [])].map((file) => file.path),
					});
				},
				stageHunks: (filePath: string, hunkIDs: string[]) => {
					pushToOperationsQueue({ type: 'stageHunks', filePath, hunkIDs });
				},
				unstageHunks: (filePath: string, hunkIDs: string[]) => {
					pushToOperationsQueue({ type: 'unstageHunks', filePath, hunkIDs });
				},
				revertHunks: (filePath: string, hunkIDs: string[]) => {
					pushToOperationsQueue({ type: 'revertHunks', filePath, hunkIDs });
				},
				commitChanges: () => {
					pushToOperationsQueue({ type: 'createCommit', commitMessage: _commitMessagePrim.value });
				},
				refresh: () => {
					pushToOperationsQueue({ type: 'refresh' });
				},
				loadDiffPatch: (filePath: string, source: DiffSource) => {
					return GetFileDiffPatch(repoPath, filePath, source);
				},
			},

			// Cleanup
			disposeStagingState: () => {
				_gitStatusPrim.kill();
				_commitMessagePrim.kill();
				_operationsQueuePrim.kill();
			},
		};
	}, [
		_gitStatusPrim,
		_commitMessagePrim,
		_operationsQueuePrim,
		isLoading,
		hasChanges,
		hasStagedChanges,
		isCommittingChanges,
		pushToOperationsQueue,
		popFromOperationsQueue,
		prematurelyStageFiles,
		prematurelyStageAllFiles,
		prematurelyUnstageFiles,
		prematurelyUnstageAllFiles,
	]);
}

export function useGitStagingStateAtoms() {
	return {
		gitStatusAtom,
		hasInitialLoadedAtom,
	};
}

function getUniqueFilesAndSort(files: git_operations.GitStatusFile[]) {
	let fileMap = new Map<string, git_operations.GitStatusFile>();
	files.forEach((file) => fileMap.set(file.path, file));

	return Array.from(fileMap.values()).sort((lhs, rhs) => {
		const leftName = lhs.path.toLocaleLowerCase();
		const rightName = rhs.path.toLocaleLowerCase();
		return leftName.localeCompare(rightName);
	});
}
