import { ModeToggle } from '@/components/mode-toggle';
import { Separator } from '@/components/ui/separator';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from '@/components/ui/sidebar';
import {
	RepoPageHandlersContext,
	SideBarMenuItem,
	useRepoPageHandlers,
} from '@/hooks/repo-page-handler-context';
import { UseAppState } from '@/hooks/state/use-app-state';
import clsx from 'clsx';
import { GitGraph, House, Terminal, GitCompare } from 'lucide-react';
import { useState, useCallback } from 'react';
import { FileTabs } from '@/components/file-tabs';
import RepoHomeView from './RepoHomeView';
import RepoLogView from './RepoLogView';
import RepoDiffView from './RepoDiffView';
import RepoTerminalView from './RepoTerminalView';
import RepoCommitDetailsView from './RepoCommitDetailsView';
import { TabProps } from '@/hooks/state/use-file-manager-state';

export default function RepoPage({ repoPath }: { repoPath: string }) {
	const [dynamicMenuItems, setDynamicMenuItems] = useState<SideBarMenuItem[]>([]);
	const [activeRepoView, setActiveRepoView] = useState('log');

	const handlers = {
		onAddNewDynamicRoute: (newItem: SideBarMenuItem) => {
			if (dynamicMenuItems.some((item) => item.url === newItem.url)) {
				// The item already exists in the menu
				return;
			}

			setDynamicMenuItems([...dynamicMenuItems, newItem]);
		},

		onCloseDynamicRoute: (oldItem: SideBarMenuItem) => {
			setDynamicMenuItems(dynamicMenuItems.filter((dynItem) => dynItem.url !== oldItem.url));
		},
	};

	// Handle opening commit details
	const handleOpenCommit = useCallback((commitHash: string) => {
		const commitItem: SideBarMenuItem = {
			title: `Commit ${commitHash.substring(0, 7)}`,
			url: `commit-${commitHash}`,
			icon: <GitGraph />,
		};
		
		if (!dynamicMenuItems.some(item => item.url === commitItem.url)) {
			setDynamicMenuItems(prev => [...prev, commitItem]);
		}
		setActiveRepoView(commitItem.url);
	}, [dynamicMenuItems]);

	// Create tabs for repo views
	const repoTabs: TabProps[] = [
		{
			tabKey: 'home',
			titleRender: () => <>Home</>,
			component: RepoHomeView,
			componentProps: { repoPath },
		},
		{
			tabKey: 'log',
			titleRender: () => <>Log</>,
			component: RepoLogView,
			componentProps: { repoPath, onCommitSelect: handleOpenCommit },
		},
		{
			tabKey: 'diff',
			titleRender: () => <>Diff</>,
			component: RepoDiffView,
			componentProps: { repoPath },
		},
		{
			tabKey: 'terminal',
			titleRender: () => <>Terminal</>,
			component: RepoTerminalView,
			componentProps: { repoPath },
		},
		// Dynamic commit tabs
		...dynamicMenuItems.map(item => ({
			tabKey: item.url,
			titleRender: () => <>{item.title}</>,
			component: RepoCommitDetailsView,
			componentProps: { 
				repoPath, 
				commitHash: item.url.replace('commit-', '') 
			},
			onTabClose: () => {
				setDynamicMenuItems(prev => prev.filter(dynItem => dynItem.url !== item.url));
			}
		}))
	];

	return (
		<SidebarProvider>
			<RepoPageHandlersContext.Provider value={handlers}>
				<RepoPageSideBar 
					dynamicMenuItems={dynamicMenuItems} 
					repoPath={repoPath}
					activeView={activeRepoView}
					onViewChange={setActiveRepoView}
				/>
				<div className="w-full h-full overflow-hidden">
					<FileTabs
						tabs={repoTabs}
						activeTabKey={activeRepoView}
						onTabChange={setActiveRepoView}
						defaultTabKey="log"
						sessionKey={`repo-${repoPath}`}
						repoPath={repoPath}
					/>
				</div>
			</RepoPageHandlersContext.Provider>
		</SidebarProvider>
	);
}

function RepoPageSideBar(props: { 
	dynamicMenuItems: SideBarMenuItem[]; 
	repoPath: string;
	activeView: string;
	onViewChange: (view: string) => void;
}) {
	const sidebar = useSidebar();
	const { appState } = UseAppState();
	const { dynamicMenuItems, repoPath, activeView, onViewChange } = props;

	// Close the sidebar on mobile because it's nicer
	const onMenuClick = (viewKey: string) => {
		sidebar.setOpenMobile(false);
		onViewChange(viewKey);
	};

	const menuItems: SideBarMenuItem[] = [
		{
			title: 'Home',
			url: 'home',
			icon: <House />,
		},
		{
			title: 'Log',
			url: 'log',
			icon: <GitGraph />,
		},
		{
			title: 'Diff',
			url: 'diff',
			icon: <GitCompare />,
		},
		{
			title: 'Terminal',
			url: 'terminal',
			icon: <Terminal />,
		},
	];
	const branchName = appState?.appConfig?.openGitRepos[repoPath]?.currentBranchName;

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<SidebarTrigger />
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>{branchName}</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{menuItems.map((item) => {
								return (
									<SidebarMenuItemRender
										key={item.url}
										menuItem={item}
										onMenuClick={onMenuClick}
										activeView={activeView}
										isDynamicRoute={false}
									/>
								);
							})}

							{dynamicMenuItems.length > 0 ? (
								<>
									<br />
									<Separator />
								</>
							) : null}

							{dynamicMenuItems.map((item) => {
								return (
									<SidebarMenuItemRender
										key={item.url}
										menuItem={item}
										onMenuClick={onMenuClick}
										activeView={activeView}
										isDynamicRoute
									/>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{/* Can have multiple SidebarGroups if necessary */}
			</SidebarContent>

			<SidebarFooter>
				<ModeToggle />
			</SidebarFooter>
		</Sidebar>
	);
}

function SidebarMenuItemRender(props: {
	menuItem: SideBarMenuItem;
	onMenuClick: (viewKey: string) => void;
	activeView: string;
	isDynamicRoute: boolean;
}) {
	const { menuItem, onMenuClick, activeView, isDynamicRoute } = props;
	const repoPageHandlers = useRepoPageHandlers();

	const onCloseClick = (event: React.MouseEvent<HTMLSpanElement>) => {
		event.preventDefault();
		event.stopPropagation();

		repoPageHandlers?.onCloseDynamicRoute(menuItem);
		// Switch to log view if we're closing the current view
		if (activeView === menuItem.url) {
			onMenuClick('log');
		}
	};

	const handleClick = () => {
		onMenuClick(menuItem.url);
	};

	return (
		<SidebarMenuItem>
			<SidebarMenuButton 
				onClick={handleClick}
				isActive={menuItem.url === activeView}
				className="flex flex-row h-4 w-4 cursor-pointer"
			>
				{menuItem.icon}
				<span className="grow">{menuItem.title}</span>

				{isDynamicRoute ? (
					<span
						className={clsx(
							'h-5 w-5 mr-1 box-border flex rounded-md items-center justify-center',
							'hover:bg-destructive text-destructive-foreground shadow-sm'
						)}
						onClick={onCloseClick}
					>
						x
					</span>
				) : null}
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}
