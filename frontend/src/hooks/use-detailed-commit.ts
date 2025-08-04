import { useQuery } from 'react-query';
import { GetDetailedCommitInfo } from '../../wailsjs/go/backend/App';
import { backend } from '../../wailsjs/go/models';
import { Logger } from '../utils/logger';

interface UseDetailedCommitOptions {
	enabled?: boolean;
	refetchOnWindowFocus?: boolean;
	staleTime?: number;
	cacheTime?: number;
}

interface UseDetailedCommitResult {
	data: backend.DetailedCommitInfo | undefined;
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	refetch: () => void;
}

export function useDetailedCommit(
	repoPath: string,
	commitHash: string,
	options: UseDetailedCommitOptions = {}
): UseDetailedCommitResult {
	const {
		enabled = true,
		refetchOnWindowFocus = false,
		staleTime = 5 * 60 * 1000, // 5 minutes
		cacheTime = 10 * 60 * 1000, // 10 minutes
	} = options;

	const query = useQuery({
		queryKey: ['detailedCommit', repoPath, commitHash],
		queryFn: async () => {
			if (!repoPath || !commitHash) {
				throw new Error('Repository path and commit hash are required');
			}
			
			try {
				const result = await GetDetailedCommitInfo(repoPath, commitHash);
				return result;
			} catch (error) {
				Logger.error(`Failed to fetch detailed commit info for ${commitHash}: ${error}`, 'use-detailed-commit');
				throw error;
			}
		},
		enabled: enabled && Boolean(repoPath) && Boolean(commitHash),
		refetchOnWindowFocus,
		staleTime,
		cacheTime,
		retry: (failureCount, error) => {
			// Don't retry if the commit doesn't exist
			if (error instanceof Error && error.message.includes('not found')) {
				return false;
			}
			// Retry up to 2 times for other errors
			return failureCount < 2;
		},
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
	});

	return {
		data: query.data,
		isLoading: query.isLoading,
		isError: query.isError,
		error: query.error as Error | null,
		refetch: query.refetch,
	};
}