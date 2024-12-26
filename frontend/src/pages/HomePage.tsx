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
			titleRender: function (): JSX.Element {
				const currentBranchName = appState.appConfig?.openGitRepos[repoPath].currentBranch;
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
				<h2 className="">Start:</h2>
				<ul>
					<li>
						<Button variant={'link'}>Open Repository</Button>
					</li>
					<li>
						<Button variant={'link'}>New Repository</Button>
					</li>
				</ul>
			</div>

			<div className="flex flex-col items-start">
				<h2>Recent:</h2>

				{appState?.appConfig?.recentGitRepos.map((repoPath) => {
					return (
						<Button key={repoPath} variant={'link'} onClick={() => onOpenRecentRepo(repoPath)}>
							{repoPath}
						</Button>
					);
				})}
				<Button onClick={onOpenNewRepo}>Open a new repo</Button>
			</div>
		</div>
	);
}
