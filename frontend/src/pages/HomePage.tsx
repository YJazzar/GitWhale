import { FileTabsHandle } from '@/components/file-tabs';
import { Button } from '@/components/ui/button';
import { UseAppState } from '@/hooks/use-app-state';
import { Link } from 'react-router';
import { backend } from 'wailsjs/go/models';
import { OpenNewRepo } from '../../wailsjs/go/backend/App';

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

	const switchToRepo = (appState: backend.App, repoPath: string) => {
		fileTabRef.current?.openFile({
			linkPath: `repo/${btoa(repoPath)}`,
			tabKey: repoPath,
			// Feels weird not to set this to true unless there's a fancy way for me to detect if the user performs an action inside the repo tab
			isPermanentlyOpen: true,
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
			<div className="flex flex-col items-start">
				<h2>Recent:</h2>

				{appState?.appConfig?.recentGitRepos.map((repoPath) => {
					return (
						<Button key={repoPath} variant={'link'} onClick={() => onOpenRecentRepo(repoPath)}>
							{repoPath}
						</Button>
					);
				})}
			</div>
		</div>
	);
}
