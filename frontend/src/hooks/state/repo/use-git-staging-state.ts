import Logger from '@/utils/logger';
import { useCallback, useMemo } from 'react';
import { CommitChanges, GetGitStatus, StageFile, UnstageFile } from '../../../../wailsjs/go/backend/App';
import { git_operations } from '../../../../wailsjs/go/models';
import { createMappedAtom, useMapPrimitive } from '../primitives/use-map-primitive';

type StagingOperation = {
	type: 'stageFiles' | 'stageAllFiles' | 'unstageFiles' | 'unstageAllFiles' | 'refresh' | 'createCommit';
	files?: string[];
	commitMessage?: string;
};

// State atoms for staging data per repository path
const gitStatusAtom = createMappedAtom<git_operations.GitStatus>();
const hasInitialLoadedAtom = createMappedAtom<boolean>();
const commitMessageAtom = createMappedAtom<string>();
const operationsQueueAtom = createMappedAtom<StagingOperation[]>();

export function useGitStagingState(repoPath: string) {
	// Track initial load state
	// const _hasInitialLoadedPrim = useMapPrimitive(hasInitialLoadedAtom, repoPath);
	const _commitMessagePrim = useMapPrimitive(commitMessageAtom, repoPath, '');
	const _gitStatusPrim = useMapPrimitive(gitStatusAtom, repoPath);

	// TODO: not sure if this will work the way i want it to, we shall see
	const _operationsQueuePrim = useMapPrimitive(operationsQueueAtom, repoPath);

	const _refreshGitStatus = useCallback(async () => {
		try {
			const status = await GetGitStatus(repoPath);
			_gitStatusPrim.set(status);
		} catch (error) {
			Logger.error(`Failed to load git status: ${error}`, 'useGitStagingState');
			return undefined;
		}
	}, [_gitStatusPrim]);

	const _stageFiles = useCallback(
		async (filePaths: string[]) => {
			// Pre-maturely move over the files into the staged files list
			_gitStatusPrim.set((oldData) => {
				const oldStagedFiles = oldData?.stagedFiles || [];
				const oldUnstagedFiles = oldData?.unstagedFiles || [];
				const oldUntrackedFiles = oldData?.untrackedFiles || [];

				const newStagedFiles = [
					...oldStagedFiles,
					...oldUnstagedFiles.filter((file) => filePaths.includes(file.path)),
					...oldUntrackedFiles.filter((file) => filePaths.includes(file.path)),
				];

				const newUntrackedFiles = [
					...oldUntrackedFiles.filter((file) => !filePaths.includes(file.path)),
				];

				const newUnstagedFiles = [
					...oldUnstagedFiles.filter((file) => !filePaths.includes(file.path)),
				];

				return new git_operations.GitStatus({
					...oldData,
					stagedFiles: newStagedFiles,
					unstagedFiles: newUnstagedFiles,
					untrackedFiles: newUntrackedFiles,
				});
			});

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

	const _stageAllFiles = useCallback(async () => {
		const gitStatusData = _gitStatusPrim.value;
		if (!gitStatusData) {
			return;
		}
		const allUnstagedFiles = [...gitStatusData.unstagedFiles, ...gitStatusData.untrackedFiles];
		_stageFiles(allUnstagedFiles.map((file) => file.path));
	}, [repoPath]);

	const _unstageAllFiles = useCallback(async () => {
		const gitStatusData = _gitStatusPrim.value;
		if (!gitStatusData) {
			return;
		}
		const allStagedFiles = gitStatusData.stagedFiles;
		_unstageFiles(allStagedFiles.map((file) => file.path));
	}, [repoPath]);

	const _commitChanges = useCallback(
		async (commitMessage: string | undefined) => {
			if (!commitMessage || commitMessage !== '') {
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
				case 'stageAllFiles':
					await _stageAllFiles();
					break;
				case 'unstageFiles':
					await _unstageFiles(operation.files ?? []);
					break;
				case 'unstageAllFiles':
					await _unstageAllFiles();
					break;
				default:
					Logger.error('Unhandled git operation type in useStagingState()');
			}

			// For any of the "editing" actions, trigger another refresh in the background once we've processed everything
			// to make sure the UI actually shows what git thinks happened
			return true;
		},
		[_refreshGitStatus, _stageFiles, _unstageFiles, _commitChanges]
	);

	const pushToOperationsQueue = useCallback(
		(newOperation: StagingOperation) => {
			_operationsQueuePrim.set((prevValue) => [...(prevValue ?? []), newOperation]);
		},
		[_operationsQueuePrim]
	);

	const popFromOperationsQueue = useCallback(async () => {
		const queue = _operationsQueuePrim.value ?? [];
		if (queue.length === 0) {
			return;
		}
		// eslint-disable-next-line no-debugger
		debugger;
		const nextOperation = queue[0];
		const shouldTriggerBackgroundRefresh = await handleGitOperation(nextOperation);
		// eslint-disable-next-line no-debugger
		debugger
		_operationsQueuePrim.set((prevValue) => {
			if (!prevValue || prevValue.length === 0) {
				return [];
			}

			// If it's recommended (by handleGitOperation) to refresh, which we should only respect after
			// all operations have been executed, then add a new refresh operation to the queue
			const newOperationsQueue = prevValue.slice(1);
			if (newOperationsQueue.length === 0 && shouldTriggerBackgroundRefresh) {
				// return [{ type: 'refresh' }];
			}

			return newOperationsQueue;
		});
	}, [handleGitOperation, _operationsQueuePrim]);

	const prematurelyStageFiles = useCallback((filePaths: string[]) => {
		// Pre-maturely move over the files into the staged files list
		_gitStatusPrim.set((oldData) => {
			const oldStagedFiles = oldData?.stagedFiles || [];
			const oldUnstagedFiles = oldData?.unstagedFiles || [];
			const oldUntrackedFiles = oldData?.untrackedFiles || [];

			const newUntrackedFiles = [...oldUntrackedFiles.filter((file) => !filePaths.includes(file.path))];
			const newUnstagedFiles = [...oldUnstagedFiles.filter((file) => !filePaths.includes(file.path))];
			const newStagedFiles = [
				...oldStagedFiles,
				...oldUnstagedFiles.filter((file) => filePaths.includes(file.path)),
				...oldUntrackedFiles.filter((file) => filePaths.includes(file.path)),
			];

			return new git_operations.GitStatus({
				...oldData,
				stagedFiles: newStagedFiles,
				unstagedFiles: newUnstagedFiles,
				untrackedFiles: newUntrackedFiles,
			});
		});
	}, []);

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
				const filesToAddToUntracked = filesToUnstage.filter((file) => isNewFileState(file.status));
				const filesToAddToTracked = filesToUnstage.filter((file) => !isNewFileState(file.status));

				const newStagedFiles = [...oldStagedFiles.filter((file) => !filePaths.includes(file.path))];
				const newUntrackedFiles = [...oldUntrackedFiles, ...filesToAddToUntracked];
				const newUnstagedFiles = [...oldUnstagedFiles, ...filesToAddToTracked];

				return new git_operations.GitStatus({
					...oldData,
					stagedFiles: newStagedFiles,
					unstagedFiles: newUnstagedFiles,
					untrackedFiles: newUntrackedFiles,
				});
			});
		},
		[_gitStatusPrim]
	);

	const prematurelyStageAllFiles = useCallback(() => {
		const unstagedFiles = _gitStatusPrim.value?.unstagedFiles || [];
		const untrackedFiles = _gitStatusPrim.value?.untrackedFiles || [];
		const filesToStage = [...unstagedFiles, ...untrackedFiles].map((file) => file.path);
		prematurelyStageFiles(filesToStage);
	}, [_gitStatusPrim]);

	const prematurelyUnstageAllFiles = useCallback(() => {
		const stagedFiles = _gitStatusPrim.value?.stagedFiles || [];
		const filesToUnstage = stagedFiles.map((file) => file.path);
		prematurelyUnstageFiles(filesToUnstage);
	}, [_gitStatusPrim]);

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
				unfulfilledActions: _operationsQueuePrim.value?.length || 0
			},

			actions: {
				processNextAction: popFromOperationsQueue,
				stageFile: (filePath: string) => {
					prematurelyStageFiles([filePath]);
					pushToOperationsQueue({ type: 'stageFiles', files: [filePath] });
				},
				stageAllFiles: () => {
					prematurelyStageAllFiles();
					pushToOperationsQueue({ type: 'stageAllFiles' });
				},
				unstageFile: (filePath: string) => {
					prematurelyUnstageFiles([filePath]);
					pushToOperationsQueue({ type: 'unstageFiles', files: [filePath] });
				},
				unstageAllFiles: () => {
					prematurelyUnstageAllFiles();
					pushToOperationsQueue({ type: 'unstageAllFiles' });
				},
				commitChanges: () => {
					pushToOperationsQueue({ type: 'createCommit', commitMessage: _commitMessagePrim.value });
				},
				refresh: () => {
					const unfulfilledOperations = _operationsQueuePrim.value ?? [];
					if (
						unfulfilledOperations.length > 0 &&
						unfulfilledOperations[unfulfilledOperations.length - 1].type === 'refresh'
					) {
						return
					}
					// eslint-disable-next-line no-debugger
					debugger
					pushToOperationsQueue({ type: 'refresh' });
				},
			},

			// Cleanup
			disposeStagingState: () => {
				_gitStatusPrim.kill();
				_commitMessagePrim.kill();
				_operationsQueuePrim.kill();
			},
		};
	}, [_gitStatusPrim, _commitMessagePrim, isLoading, hasChanges, hasStagedChanges, pushToOperationsQueue]);
}

export function useGitStagingStateAtoms() {
	return {
		gitStatusAtom,
		hasInitialLoadedAtom,
	};
}
