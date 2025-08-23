import { Button } from '@/components/ui/button';
import { useNavigateRootFilTabs } from '@/hooks/navigation/use-navigate-root-file-tabs';
import { UseAppState } from '@/hooks/state/use-app-state';
import { Bug, FileText, FolderOpen, Lightbulb, Settings, Star } from 'lucide-react';
import { ToggleStarRepo } from '../../wailsjs/go/backend/App';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

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
	const starredRepos1 = appState?.appConfig?.starredGitRepos ?? [];
	const recentRepos = appState?.appConfig?.recentGitRepos ?? [];
	const nonStarredRecentRepos1 = recentRepos.filter((repo) => !starredRepos1.includes(repo));
	const nonStarredRecentRepos = [...nonStarredRecentRepos1, ...nonStarredRecentRepos1, ...nonStarredRecentRepos1, ...nonStarredRecentRepos1, ...nonStarredRecentRepos1, ...nonStarredRecentRepos1, ...nonStarredRecentRepos1, ...nonStarredRecentRepos1, ...nonStarredRecentRepos1, ...nonStarredRecentRepos1, ...nonStarredRecentRepos1, ...nonStarredRecentRepos1, ...nonStarredRecentRepos1, ...nonStarredRecentRepos1, ...nonStarredRecentRepos1, ]
	const starredRepos = nonStarredRecentRepos
	
	// Detect platform for keyboard shortcut
	const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
	const shortcutKey = isMac ? '⌘' : 'Ctrl';

	return (
		<div className="h-full flex flex-col p-8">
			{/* Main content area - takes remaining space */}
			<div className="flex-1 flex items-center justify-center min-h-0">
				<div className="flex items-center justify-center gap-8 h-full max-h-full">
					{/* Column 1: actions */}
					<div className="flex flex-col items-center justify-center">
						<ul className="space-y-2">
							<li>
								<Button
									variant="link"
									onClick={rootNavigation.onOpenNewRepo}
									className="justify-start p-0"
								>
									<FolderOpen className="h-4 w-4 mr-2" />
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
							<li>
								<Button
									variant="link"
									onClick={rootNavigation.onOpenStateInspector}
									className="justify-start p-0"
								>
									<Bug className="h-4 w-4 mr-2" />
									State Inspector
								</Button>
							</li>
						</ul>
					</div>

					<Separator orientation="vertical" className="h-64" />

					{/* Column 2: Repo lists */}
					<div className="flex flex-col max-h-full min-w-fit">
						{starredRepos.length > 0 && (
							<div className="mb-6">
								<h2 className="text-xl font-semibold mb-4">Starred:</h2>
								<ScrollArea className="max-h-40">
									<div className="space-y-2 pr-3">
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
								</ScrollArea>
							</div>
						)}

						{nonStarredRecentRepos.length > 0 && (
							<div>
								<h2 className="text-xl font-semibold mb-4">Recent:</h2>
								<ScrollArea className="max-h-60">
									<div className="space-y-2 pr-3">
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
								</ScrollArea>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Command Palette Tip - Always visible at bottom */}
			<div className="pt-8 flex-shrink-0 flex justify-center">
				<div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg w-fit">
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
				{repoPath}
			</Button>
		</div>
	);
}
