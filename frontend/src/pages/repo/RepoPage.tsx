import { Sidebar } from '@/components/sidebar';
import { useCommandPaletteState } from '@/hooks/command-palette/use-command-palette-state';
import { SidebarItemProps } from '@/hooks/state/useSidebarHandlers';
import RepoHomeView from '@/pages/repo/RepoHomeView';
import RepoLogView from '@/pages/repo/RepoLogView';
import RepoTerminalView from '@/pages/repo/RepoTerminalView';
import RepoActiveDiffPage from '@/pages/repo/RepoActiveDiffPage';
import { CommandPaletteContextKey } from '@/types/command-palette';
import { GitGraph, House, Terminal, GitAdd } from 'lucide-react';
import { useEffect } from 'react';

export type RepoViewType = 'home' | 'log' | 'diff' | 'terminal' | 'staging';

interface RepoViewTabsProps {
	repoPath: string;
	className?: string;
}

export default function RepoPage({ repoPath, className }: RepoViewTabsProps) {
	const commandPaletteState = useCommandPaletteState();

	// Static sidebar items that are always available
	const staticItems: SidebarItemProps[] = [
		{
			id: 'home',
			title: 'Home',
			icon: <House className="h-4 w-4" />,
			component: <RepoHomeView repoPath={repoPath} />,
			preventClose: true,
		},
		{
			id: 'staging',
			title: 'Staging',
			icon: <GitAdd className="h-4 w-4" />,
			component: <RepoActiveDiffPage repoPath={repoPath} />,
			preventClose: true,
		},
		{
			id: 'log',
			title: 'Log',
			icon: <GitGraph className="h-4 w-4" />,
			component: <RepoLogView repoPath={repoPath} />,
			preventClose: true,
		},
		{
			id: 'terminal',
			title: 'Terminal',
			icon: <Terminal className="h-4 w-4" />,
			component: <RepoTerminalView repoPath={repoPath} />,
			preventClose: true,
		},
	];

	useEffect(() => {
		commandPaletteState.availableContexts.addContext({
			contextKey: CommandPaletteContextKey.Repo,
			repoPath: repoPath,
		});

		return () => {
			commandPaletteState.availableContexts.removeContext(CommandPaletteContextKey.Repo);
		};
	}, []);

	// Handler for wh
	return (
		<div className={`h-full w-full ${className || ''}`}>
			<Sidebar
				sidebarSessionKey={`repo-${repoPath}`}
				staticItems={staticItems}
				initialMode="wide"
				defaultItemId="home"
			/>
		</div>
	);
}
