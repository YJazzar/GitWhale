import { Button } from '@/components/ui/button';
import { useNavigateRootFilTabs } from '@/hooks/navigation/use-navigate-root-file-tabs';
import { UseAppState } from '@/hooks/state/use-app-state';
import { FileText, FolderOpen, Lightbulb, Settings, Star } from 'lucide-react';
import { memo } from 'react';
import { ToggleStarRepo } from '../../wailsjs/go/backend/App';

export default function HomePage() {
	const { appState, refreshAppState } = UseAppState();
	const rootNavigation = useNavigateRootFilTabs();

	const onToggleStar = async (repoPath: string) => {
		await ToggleStarRepo(repoPath);
		await refreshAppState();
	};

	const onOpenRepo = (repoPath: string) => {
		rootNavigation.onOpenRepoWithPath(repoPath);
	};

	// Separate starred and non-starred repos for display
	const starredRepos = appState?.appConfig?.starredGitRepos ?? [];
	const recentRepos = appState?.appConfig?.recentGitRepos ?? [];
	const nonStarredRecentRepos = recentRepos.filter((repo) => !starredRepos.includes(repo));

	// Detect platform for keyboard shortcut
	const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
	const shortcutKey = isMac ? '⌘' : 'Ctrl';

	return (
		<div className="h-full flex flex-col items-center justify-center p-8">
			<div className="grid grid-cols-2 gap-6 max-w-xl w-full">
				{/* Column 1: actions */}
				<div className="flex flex-col items-center justify-center">
					<ul className="space-y-2">
						<li>
							<Button
								variant="link"
								onClick={rootNavigation.onOpenNewRepo}
								className="justify-start p-0"
							>
								<FolderOpen />
								Open Repository
							</Button>
						</li>
						<li>
							<Button
								variant="link"
								onClick={rootNavigation.onOpenSettings}
								className="justify-start p-0"
							>
								<Settings className="h-4 w-4 mr-2" />
								Settings
							</Button>
						</li>
						<li>
							<Button
								variant="link"
								onClick={rootNavigation.onOpenApplicationLogs}
								className="justify-start p-0"
							>
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
										<RepoEntry
											key={repoPath}
											repoPath={repoPath}
											isStarred
											onOpenRepo={onOpenRepo}
											onToggleStar={onToggleStar}
										/>
									))}
								</div>
							</div>
						)}

						{nonStarredRecentRepos.length > 0 && (
							<div>
								<h2 className="text-xl font-semibold mb-4">Recent:</h2>
								<div className="space-y-2">
									{nonStarredRecentRepos.map((repoPath) => (
										<RepoEntry
											key={repoPath}
											repoPath={repoPath}
											isStarred={false}
											onOpenRepo={onOpenRepo}
											onToggleStar={onToggleStar}
										/>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Command Palette Tip */}
			<div className="mt-8 max-w-xl w-full">
				<div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
					<div className="flex items-center gap-2 text-primary">
						<Lightbulb className="h-5 w-5" />
						<span className="text-sm font-medium">Tip:</span>
					</div>
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span>Press</span>
						<kbd className="inline-flex items-center gap-1 px-1.5 bg-muted border border-border rounded font-mono">
							{shortcutKey} + P
						</kbd>
						<span>to open the command palette</span>
					</div>
				</div>
			</div>
		</div>
	);
}

interface RepoEntryProps {
	repoPath: string;
	isStarred: boolean;
	onToggleStar: (repoPath: string) => void;
	onOpenRepo: (repoPath: string) => void;
}

function RepoEntry(props: RepoEntryProps) {
	const { repoPath, isStarred, onToggleStar, onOpenRepo } = props;
	return (
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
				onClick={() => onOpenRepo(repoPath)}
				className="flex-1 justify-start"
				title={repoPath}
			>
				{repoPath} hi
			</Button>
		</div>
	);
}
