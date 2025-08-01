import { FileTabsHandle } from '@/components/file-tabs';
import { Button } from '@/components/ui/button';
import { UseAppState } from '@/hooks/state/use-app-state';
import { Star, StarOff } from 'lucide-react';
import { Link } from 'react-router';
import { backend } from 'wailsjs/go/models';
import { OpenNewRepo, ToggleStarRepo } from '../../wailsjs/go/backend/App';
import { useRepoState } from '@/hooks/state/use-repo-state';

export default function HomePage(props: { fileTabRef: React.RefObject<FileTabsHandle> }) {
	const { fileTabRef } = props;
	const { appState, refreshAppState } = UseAppState();

	const onOpenRecentRepo = (repoPath: string) => {
		if (!appState) {
			return;
		}

		switchToRepo(appState, repoPath);
	};

	const onOpenNewRepo = async () => {
		const newRepoPath = await OpenNewRepo();
		const newAppState = await refreshAppState();
		switchToRepo(newAppState, newRepoPath);
	};

	const onToggleStar = async (repoPath: string) => {
		await ToggleStarRepo(repoPath);
		await refreshAppState();
	};

	const switchToRepo = (appState: backend.App, repoPath: string) => {
		fileTabRef.current?.openFile({
			linkPath: `repo/${btoa(repoPath)}`,
			tabKey: repoPath,
			preventUserClose: false,
			// Feels weird not to set this to true unless there's a fancy way for me to detect if the user performs an action inside the repo tab
			isPermanentlyOpen: true,
			onTabClose: () => {
				const repoState = useRepoState(repoPath)
				repoState.terminalState.disposeTerminal()
			},
			titleRender: function (): JSX.Element {
				const currentBranchName = appState.appConfig?.openGitRepos[repoPath].currentBranchName;
				const repoName = repoPath;
				return (
					<>
						{repoName + ' '}({currentBranchName})
					</>
				);
			},
		});
	};

	const RepoEntry = ({ repoPath, isStarred }: { repoPath: string; isStarred: boolean }) => (
		<div className="flex items-center">
			{/* Start button */}
			<Button
				variant={'ghost'}
				size={'sm'}
				onClick={() => onToggleStar(repoPath)}
				className="h-4 w-4"
			>
				{isStarred ? (
					<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
				) : (
					<Star className="h-4 w-4" />
				)}
			</Button>

			{/* Repo open button link */}
			<Button
				variant={'link'}
				onClick={() => onOpenRecentRepo(repoPath)}
				className="flex-1 justify-start"
			>
				{repoPath}
			</Button>
			
		</div>
	);

	// Get starred and non-starred repos
	const starredRepos = appState?.appConfig?.starredGitRepos || [];
	const recentRepos = appState?.appConfig?.recentGitRepos || [];
	const nonStarredRecentRepos = recentRepos.filter((repo) => !starredRepos.includes(repo));

	return (
		<div className="grid h-full place-content-center">
			<div className="flex flex-col items-start ">
				<h2>Start:</h2>
				<ul>
					<li>
						<Button variant={'link'} onClick={onOpenNewRepo}>
							Open Repository
						</Button>
					</li>
					<li>
						<Button disabled variant={'link'}>
							New Repository
						</Button>
					</li>
				</ul>
			</div>
			<br />
			{starredRepos.length > 0 && (
				<>
					<div className="flex flex-col items-start">
						<h2>Starred:</h2>
						{starredRepos.map((repoPath) => (
							<RepoEntry key={repoPath} repoPath={repoPath} isStarred={true} />
						))}
					</div>
					<br />
				</>
			)}
			{nonStarredRecentRepos.length > 0 && (
				<>
					<div className="flex flex-col items-start">
						<h2>Recent:</h2>
						{nonStarredRecentRepos.map((repoPath) => (
							<RepoEntry key={repoPath} repoPath={repoPath} isStarred={false} />
						))}
					</div>
				</>
			)}
		</div>
	);
}
