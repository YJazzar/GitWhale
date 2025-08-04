import { Button } from '@/components/ui/button';
import { UseAppState } from '@/hooks/state/use-app-state';
import { Star, Settings, FolderOpen, FolderGit2, FileText } from 'lucide-react';
import { backend } from 'wailsjs/go/models';
import { OpenNewRepo, ToggleStarRepo } from '../../wailsjs/go/backend/App';
import { useEffect, useRef, useState, useCallback, useLayoutEffect, memo } from 'react';

export default function HomePage(props: {
	onOpenRepo: (repoPath: string) => void;
	onOpenSettings: () => void;
	onOpenApplicationLogs: () => void;
}) {
	const { onOpenRepo, onOpenSettings, onOpenApplicationLogs } = props;
	const { appState, refreshAppState } = UseAppState();

	const onOpenRecentRepo = (repoPath: string) => {
		if (!appState) {
			return;
		}

		onOpenRepo(repoPath);
	};

	const onOpenNewRepo = async () => {
		const newRepoPath = await OpenNewRepo();
		await refreshAppState();
		onOpenRepo(newRepoPath);
	};

	const onToggleStar = async (repoPath: string) => {
		await ToggleStarRepo(repoPath);
		await refreshAppState();
	};

	// Memoized RepoEntry component to prevent unnecessary re-renders
	const RepoEntry = memo(({ repoPath, isStarred }: { repoPath: string; isStarred: boolean }) => (
		<div className="flex items-center">
			{/* Star button */}
			<Button variant="ghost" size="sm" onClick={() => onToggleStar(repoPath)} className="h-4 w-4">
				{isStarred ? (
					<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
				) : (
					<Star className="h-4 w-4" />
				)}
			</Button>

			{/* Repo open link */}
			<Button
				variant="link"
				onClick={() => onOpenRecentRepo(repoPath)}
				className="flex-1 justify-start"
				title={repoPath}
			>
				{repoPath}
			</Button>
		</div>
	));

	// Separate starred and non-starred repos for display
	const starredRepos = appState?.appConfig?.starredGitRepos ?? [];
	const recentRepos = appState?.appConfig?.recentGitRepos ?? [];
	const nonStarredRecentRepos = recentRepos.filter((repo) => !starredRepos.includes(repo));

	return (
		<div className="h-full flex items-center justify-center p-8">
			<div className="grid grid-cols-2 gap-6 max-w-xl w-full">
				{/* Column 1: actions */}
				<div className="flex flex-col items-center justify-center">
					<ul className="space-y-2">
						<li>
							<Button variant="link" onClick={onOpenNewRepo} className="justify-start p-0">
								<FolderOpen />
								Open Repository
							</Button>
						</li>
						<li>
							<Button variant="link" onClick={onOpenSettings} className="justify-start p-0">
								<Settings className="h-4 w-4 mr-2" />
								Settings
							</Button>
						</li>
						<li>
							<Button variant="link" onClick={onOpenApplicationLogs} className="justify-start p-0">
								<FileText className="h-4 w-4 mr-2" />
								Application Logs
							</Button>
						</li>
					</ul>
				</div>

				{/* Vertical separator */}
				<div className="relative">
					<div className="absolute left-0 top-0 bottom-0 w-px bg-border -translate-x-3" />

					{/* Column 2: Repo lists */}
					<div className="flex flex-col items-start">
						{starredRepos.length > 0 && (
							<div className="mb-8">
								<h2 className="text-xl font-semibold mb-4">Starred:</h2>
								<div className="space-y-2">
									{starredRepos.map((repoPath) => (
										<RepoEntry key={repoPath} repoPath={repoPath} isStarred />
									))}
								</div>
							</div>
						)}

						{nonStarredRecentRepos.length > 0 && (
							<div>
								<h2 className="text-xl font-semibold mb-4">Recent:</h2>
								<div className="space-y-2">
									{nonStarredRecentRepos.map((repoPath) => (
										<RepoEntry key={repoPath} repoPath={repoPath} isStarred={false} />
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
