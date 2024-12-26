import { Button } from '@/components/ui/button';
import { UseAppState } from '@/hooks/use-app-state';
import { OpenNewRepo } from '../../wailsjs/go/backend/App';

export default function HomePage() {
	const {appState, executeAndRefreshState} = UseAppState();

	const onOpenRecentRepo = (repoPath: string) => {};

	const onOpenNewRepo = async () => {
		executeAndRefreshState(OpenNewRepo)
	}

	return (
		<div className="grid h-full place-content-center">
			Recent repos:
			{appState?.appConfig?.recentGitRepos.map((repoPath) => {
				return <div onClick={() => onOpenRecentRepo(repoPath)}>{repoPath}</div>;
			})}
			<Button onClick={onOpenNewRepo}>Open a new repo</Button>
		</div>
	);
}
