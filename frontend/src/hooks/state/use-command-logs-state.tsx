import { atom, useAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import { ClearCommandLogs, GetCommandById, GetCommandLogs } from '../../../wailsjs/go/backend/App';
import { command_utils } from '../../../wailsjs/go/models';

// Atoms for command logs state
const commandLogsAtom = atom<command_utils.CommandEntry[]>([]);
const isLoadingAtom = atom<boolean>(false);
const lastRefreshAtom = atom<Date | null>(null);

export const useCommandLogsState = () => {
	const [commands, setCommands] = useAtom(commandLogsAtom);
	const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
	const [lastRefresh, setLastRefresh] = useAtom(lastRefreshAtom);
	const refreshIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const refreshCommands = async () => {
		try {
			setIsLoading(true);
			const commandLogs = await GetCommandLogs();
			setCommands(commandLogs || []);
			setLastRefresh(new Date());
		} catch (error) {
			console.error('Failed to fetch command logs:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const clearAllCommands = async () => {
		try {
			await ClearCommandLogs();
		} catch (error) {
			console.error('Failed to clear command logs:', error);
		}
		await refreshCommands();
	};

	const getCommandById = async (id: string) => {
		try {
			return await GetCommandById(id);
		} catch (error) {
			console.error('Failed to get command by ID:', error);
			return null;
		}
	};

	// Start polling when hook is used
	useEffect(() => {
		// Initial load
		refreshCommands();

		// Set up polling every 2.5 seconds
		refreshIntervalRef.current = setInterval(() => {
			refreshCommands();
		}, 2500);

		// Cleanup on unmount
		return () => {
			if (refreshIntervalRef.current) {
				clearInterval(refreshIntervalRef.current);
			}
		};
	}, []);

	// Derived state
	const runningCommands = commands.filter((cmd) => cmd.status === 0); // CommandRunning = 0
	const completedCommands = commands.filter((cmd) => cmd.status !== 0);
	const successCommands = commands.filter((cmd) => cmd.status === 1); // CommandSuccess = 1
	const failedCommands = commands.filter((cmd) => cmd.status === 2); // CommandFailed = 2

	const statistics = {
		total: commands.length,
		running: runningCommands.length,
		completed: completedCommands.length,
		success: successCommands.length,
		failed: failedCommands.length,
		successRate:
			completedCommands.length > 0 ? (successCommands.length / completedCommands.length) * 100 : 0,
	};

	return {
		// Data
		commands: {
			all: commands,
			runningCommands,
			completedCommands,
			successCommands,
			failedCommands,
		},
		statistics,

		// State
		isLoading,
		lastRefresh,

		// Actions
		refreshCommands,
		clearAllCommands,
		getCommandById,

		// Utilities
		formatDuration: (nanoseconds: number) => {
			const ms = nanoseconds / 1000000; // Convert nanoseconds to milliseconds
			if (ms < 1000) return `${Math.round(ms)}ms`;
			const seconds = ms / 1000;
			if (seconds < 60) return `${seconds.toFixed(1)}s`;
			const minutes = seconds / 60;
			if (minutes < 60) return `${minutes.toFixed(1)}m`;
			const hours = minutes / 60;
			return `${hours.toFixed(1)}h`;
		},

		formatTimeAgo: (date: string) => {
			const now = new Date();
			const past = new Date(date);
			const diffMs = now.getTime() - past.getTime();
			const diffSeconds = Math.floor(diffMs / 1000);
			const diffMinutes = Math.floor(diffSeconds / 60);
			const diffHours = Math.floor(diffMinutes / 60);
			const diffDays = Math.floor(diffHours / 24);

			if (diffSeconds < 60) return 'just now';
			if (diffMinutes < 60) return `${diffMinutes}m ago`;
			if (diffHours < 24) return `${diffHours}h ago`;
			return `${diffDays}d ago`;
		},
	};
};
