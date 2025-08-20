import {
	createLoadTrackedMappedAtom,
	useLoadTrackedMapPrimitive,
} from '@/hooks/state/primitives/use-load-tracked-map-primitive';
import Logger from '@/utils/logger';
import { atom } from 'jotai';
import { useEffect, useState } from 'react';
import {
	GetGitStatus,
	StageFile,
	UnstageFile,
	StageAllFiles,
	UnstageAllFiles,
	CommitChanges,
} from '../../../../wailsjs/go/backend/App';
import { git_operations } from '../../../../wailsjs/go/models';
import { useMapPrimitive } from '../primitives/use-map-primitive';

// State atoms for staging data per repository path
const gitStatusAtom = createLoadTrackedMappedAtom<git_operations.GitStatus>();

// Track if data has been initially loaded for each repo
const hasInitialLoadedAtom = atom<Map<string, boolean>>(new Map());

export function getStagingState(repoPath: string) {
	const _gitStatusPrim = useLoadTrackedMapPrimitive(gitStatusAtom, repoPath, async () => {
		try {
			const status = await GetGitStatus(repoPath);
			return status;
		} catch (error) {
			Logger.error(`Failed to load git status: ${error}`, 'StagingState');
			return undefined;
		}
	});

	// Track initial load state
	const _hasInitialLoadedPrim = useMapPrimitive(hasInitialLoadedAtom, repoPath);
	const [needsToReload, setNeedsToReload] = useState(false);

	// Refresh git status
	const refreshGitStatus = async () => {
		if (!needsToReload) {
			return;
		}

		_gitStatusPrim.load();
		_hasInitialLoadedPrim.set(true);
		setNeedsToReload(false);
	};

	// Auto-load data on first use
	useEffect(() => {
		refreshGitStatus();
	}, [needsToReload, refreshGitStatus]);

	useEffect(() => {
		if (!_hasInitialLoadedPrim.value) {
			setNeedsToReload(true);
		}
	}, []);

	// Staging operations
	const stageFile = async (filePath: string) => {
		try {
			await StageFile(repoPath, filePath);
			setNeedsToReload(true); // Refresh status after staging
			Logger.info(`Successfully staged file: ${filePath}`, 'StagingState');
		} catch (error) {
			Logger.error(`Failed to stage file ${filePath}: ${error}`, 'StagingState');
			throw error;
		}
	};

	const unstageFile = async (filePath: string) => {
		try {
			await UnstageFile(repoPath, filePath);
			setNeedsToReload(true); // Refresh status after unstaging
			Logger.info(`Successfully unstaged file: ${filePath}`, 'StagingState');
		} catch (error) {
			Logger.error(`Failed to unstage file ${filePath}: ${error}`, 'StagingState');
			throw error;
		}
	};

	const stageAllFiles = async () => {
		try {
			await StageAllFiles(repoPath);
			setNeedsToReload(true); // Refresh status after staging all
			Logger.info('Successfully staged all files', 'StagingState');
		} catch (error) {
			Logger.error(`Failed to stage all files: ${error}`, 'StagingState');
			throw error;
		}
	};

	const unstageAllFiles = async () => {
		try {
			await UnstageAllFiles(repoPath);
			setNeedsToReload(true); // Refresh status after unstaging all
			Logger.info('Successfully unstaged all files', 'StagingState');
		} catch (error) {
			Logger.error(`Failed to unstage all files: ${error}`, 'StagingState');
			throw error;
		}
	};

	const commitChanges = async (message: string) => {
		try {
			await CommitChanges(repoPath, message);
			setNeedsToReload(true); // Refresh status after commit
			Logger.info(`Successfully committed changes: ${message}`, 'StagingState');
		} catch (error) {
			Logger.error(`Failed to commit changes: ${error}`, 'StagingState');
			throw error;
		}
	};

	const isLoading = _gitStatusPrim.isLoading;
	const hasChanges = _gitStatusPrim.value?.hasChanges ?? false;
	const hasStagedChanges = (_gitStatusPrim.value?.stagedFiles?.length ?? 0) > 0;

	return {
		// Data
		gitStatus: _gitStatusPrim,
		hasChanges,
		hasStagedChanges,

		// Loading states
		isLoading,

		// Actions
		stageFile,
		unstageFile,
		stageAllFiles,
		unstageAllFiles,
		commitChanges,
		refreshGitStatus: () => setNeedsToReload(true),

		// Cleanup
		disposeStagingState: () => {
			_gitStatusPrim.kill();
			_hasInitialLoadedPrim.kill();
		},
	};
}

export function useGitStagingStateAtoms() {
	return {
		gitStatusAtom,
		hasInitialLoadedAtom,
	};
}
