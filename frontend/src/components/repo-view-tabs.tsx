import { UseAppState } from '@/hooks/state/use-app-state';
import clsx from 'clsx';
import { GitGraph, House, Terminal, GitCompare, X } from 'lucide-react';
import { useState, ReactNode } from 'react';
import RepoHomeView from '@/pages/repo/RepoHomeView';
import RepoLogView from '@/pages/repo/RepoLogView';
import RepoTerminalView from '@/pages/repo/RepoTerminalView';
import RepoDiffView from '@/pages/repo/RepoDiffView';

export type RepoViewType = 'home' | 'log' | 'diff' | 'terminal';

export interface RepoViewTab {
	id: string;
	viewType: RepoViewType;
	title: string;
	icon: ReactNode;
	component: ReactNode;
	preventUserClose?: boolean;
}

export interface DynamicRepoViewTab {
	id: string;
	title: string;
	icon: ReactNode;
	component: ReactNode;
	onClose?: () => void;
}

interface RepoViewTabsProps {
	repoPath: string;
	className?: string;
}

export function RepoViewTabs({ repoPath, className }: RepoViewTabsProps) {
	const { appState } = UseAppState();
	const [activeTabId, setActiveTabId] = useState<string>('home');
	const [dynamicTabs, setDynamicTabs] = useState<DynamicRepoViewTab[]>([]);

	// Static tabs that are always available
	const staticTabs: RepoViewTab[] = [
		{
			id: 'home',
			viewType: 'home',
			title: 'Home',
			icon: <House className="h-4 w-4" />,
			component: <RepoHomeView repoPath={repoPath} />,
			preventUserClose: true,
		},
		{
			id: 'log',
			viewType: 'log',  
			title: 'Log',
			icon: <GitGraph className="h-4 w-4" />,
			component: <RepoLogView repoPath={repoPath} />,
			preventUserClose: true,
		},
		{
			id: 'diff',
			viewType: 'diff',
			title: 'Diff',
			icon: <GitCompare className="h-4 w-4" />,
			component: <RepoDiffView repoPath={repoPath} />,
			preventUserClose: true,
		},
		{
			id: 'terminal',
			viewType: 'terminal',
			title: 'Terminal',
			icon: <Terminal className="h-4 w-4" />,
			component: <RepoTerminalView repoPath={repoPath} />,
			preventUserClose: true,
		},
	];

	const allTabs = [...staticTabs, ...dynamicTabs];
	const activeTab = allTabs.find(tab => tab.id === activeTabId);

	const branchName = appState?.appConfig?.openGitRepos[repoPath]?.currentBranchName;

	const handleTabClick = (tabId: string) => {
		setActiveTabId(tabId);
	};

	const handleDynamicTabClose = (tabId: string) => {
		const tab = dynamicTabs.find(t => t.id === tabId);
		if (tab?.onClose) {
			tab.onClose();
		}
		
		setDynamicTabs(prev => prev.filter(t => t.id !== tabId));
		
		// If we're closing the active tab, switch to home
		if (activeTabId === tabId) {
			setActiveTabId('home');
		}
	};

	const addDynamicTab = (tab: DynamicRepoViewTab) => {
		// Check if tab already exists
		if (dynamicTabs.some(t => t.id === tab.id)) {
			setActiveTabId(tab.id);
			return;
		}
		
		setDynamicTabs(prev => [...prev, tab]);
		setActiveTabId(tab.id);
	};

	// Expose API for adding dynamic tabs
	(window as any).addRepoViewTab = addDynamicTab;

	return (
		<div className={clsx('h-full w-full flex', className)}>
			{/* Sidebar */}
			<div className="w-64 border-r border-border bg-background flex flex-col">
				{/* Header */}
				<div className="p-4 border-b border-border">
					<div className="text-sm font-medium text-muted-foreground">
						{branchName || 'Repository'}
					</div>
				</div>

				{/* Navigation */}
				<div className="flex-1 p-2 space-y-1">
					{staticTabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => handleTabClick(tab.id)}
							className={clsx(
								'w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
								'hover:bg-accent hover:text-accent-foreground',
								activeTabId === tab.id
									? 'bg-accent text-accent-foreground'
									: 'text-muted-foreground'
							)}
						>
							{tab.icon}
							{tab.title}
						</button>
					))}

					{/* Dynamic tabs section */}
					{dynamicTabs.length > 0 && (
						<>
							<div className="border-t border-border my-2 pt-2">
								<div className="text-xs font-medium text-muted-foreground px-3 py-1">
									Open Views
								</div>
							</div>
							{dynamicTabs.map((tab) => (
								<div
									key={tab.id}
									className={clsx(
										'group flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
										'hover:bg-accent hover:text-accent-foreground',
										activeTabId === tab.id
											? 'bg-accent text-accent-foreground'
											: 'text-muted-foreground'
									)}
								>
									<button
										onClick={() => handleTabClick(tab.id)}
										className="flex-1 flex items-center gap-3 text-left"
									>
										{tab.icon}
										{tab.title}
									</button>
									<button
										onClick={() => handleDynamicTabClose(tab.id)}
										className="opacity-0 group-hover:opacity-100 p-1 rounded-sm hover:bg-destructive/10 hover:text-destructive transition-all"
									>
										<X className="h-3 w-3" />
									</button>
								</div>
							))}
						</>
					)}
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 h-full overflow-hidden">
				{activeTab ? (
					<div className="h-full w-full">
						{activeTab.component}
					</div>
				) : (
					<div className="h-full w-full flex items-center justify-center text-muted-foreground">
						No view selected
					</div>
				)}
			</div>
		</div>
	);
}