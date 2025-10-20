import Logger from '@/utils/logger';
import { useEffect } from 'react';
import { EventsOn } from '../../../../wailsjs/runtime/runtime';

export interface RepoFileSystemEvent {
	repoPath: string;
	target: string;
	eventOp: string;
	timestamp: number;
}

export function useRepoStageWatcher(repoPath: string, onChange?: (event: RepoFileSystemEvent) => void) {
	useEffect(() => {
		if (!repoPath) {
			return;
		}

		const handler = (event: RepoFileSystemEvent) => {
			if (!event || event.repoPath !== repoPath) {
				return;
			}

			try {
				onChange?.(event);
			} catch (error) {
				Logger.error(`Repo watcher handler failed: ${error}`, 'useRepoStageWatcher');
			}
		};

		const unregister = EventsOn('repo:fsupdate', handler);

		return () => {
			unregister?.();
		};
	}, [repoPath, onChange]);
}
