import { UseAppState } from '@/hooks/state/use-app-state';
import { GitGraph, House, Terminal, GitCompare } from 'lucide-react';
import { ReactNode, useRef } from 'react';
import RepoHomeView from '@/pages/repo/RepoHomeView';
import RepoLogView from '@/pages/repo/RepoLogView';
import RepoTerminalView from '@/pages/repo/RepoTerminalView';
import RepoDiffView from '@/pages/repo/RepoDiffView';
import { Sidebar, SidebarHandle } from '@/components/sidebar';
import { SidebarItemProps } from '@/hooks/state/use-sidebar-state';
import { SidebarContextProvider } from '@/hooks/state/use-sidebar-context';
import { Logger } from '@/utils/logger';

export type RepoViewType = 'home' | 'log' | 'diff' | 'terminal';

interface RepoViewTabsProps {
	repoPath: string;
	className?: string;
}

export default function RepoPage({ repoPath, className }: RepoViewTabsProps) {
	const { appState } = UseAppState();
	const sidebarRef = useRef<SidebarHandle>(null);
	const branchName = appState?.appConfig?.openGitRepos[repoPath]?.currentBranchName || 'main';

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
			id: 'log',
			title: 'Log',
			icon: <GitGraph className="h-4 w-4" />,
			component: <RepoLogView repoPath={repoPath} />,
			preventClose: true,
		},
		{
			id: 'diff',
			title: 'Diff',
			icon: <GitCompare className="h-4 w-4" />,
			component: <RepoDiffView repoPath={repoPath} />,
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

	// Handler for when sidebar items are clicked
	const handleItemClick = (itemId: string) => {
		// Additional logic can be added here if needed
		Logger.debug(`Clicked sidebar item: ${itemId}`, 'RepoPage');
	};

	// Function to add dynamic items (for future use)
	const addDynamicItem = (item: SidebarItemProps) => {
		sidebarRef.current?.addDynamicItem(item);
	};

	return (
		<div className={`h-full w-full ${className || ''}`}>
			<SidebarContextProvider sidebarRef={sidebarRef}>
				<Sidebar
					ref={sidebarRef}
					sidebarSessionKey={`repo-${repoPath}`}
					staticItems={staticItems}
					initialMode="wide"
					defaultItemId="home"
					onItemClick={handleItemClick}
				/>
			</SidebarContextProvider>
		</div>
	);
}
