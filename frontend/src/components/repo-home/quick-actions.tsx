import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { useSidebarContext } from '@/hooks/state/use-sidebar-context';
import { Eye, FolderArchiveIcon, FolderOpen, FoldHorizontal, GitCompare, Search, Terminal, Zap } from 'lucide-react';
import { CompareModal } from '../git-log/compare-modal';
import { useState } from 'react';

interface QuickActionsProps {
	repoPath: string;
}

export function QuickActions(props: QuickActionsProps) {
	const { repoPath } = props;
	const sidebar = useSidebarContext();
	const repoState = useRepoState(repoPath);

	const [showCompareModal, setShowCompareModal] = useState(false);

	const actions = [
		{
			icon: Eye,
			label: 'View Log',
			description: 'Browse commit history',
			action: () => {
				/* Navigate to log view */
				sidebar.setActiveItem('log');
			},
		},
		{
			icon: GitCompare,
			label: 'Compare',
			description: 'Compare branches or commits',
			action: () => {
				setShowCompareModal(true)
			},
		},
		{
			icon: Search,
			label: 'Search',
			description: 'Find commits or files',
			action: () => {
				/* Focus search */
			},
		},
		{
			icon: Terminal,
			label: 'Terminal',
			description: 'Open in terminal',
			action: () => {
				/* Open terminal */
				sidebar.setActiveItem('terminal');
			},
		},
	];

	return (
		<>
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-lg">

						<FolderOpen className="h-4 w-4 text-blue-500" />
						{repoPath}
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-0">
					{repoState.logState.isLoading ? (
						<div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
							{Array.from({ length: 4 }).map((_, index) => (
								<div key={index} className="h-auto p-3 flex-col items-start gap-1 space-y-2 rounded-lg border">
									<div className="flex items-center gap-2 w-full">
										<Skeleton className="h-3.5 w-3.5 rounded-sm" />
										<Skeleton className="h-4 w-16" />
									</div>
									<Skeleton className="h-3 w-full" />
								</div>
							))}
						</div>
					) : (
						<div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
							{actions.map((action, index) => (
								<Button
									key={index}
									variant={'outline'}
									className="h-auto p-3 flex-col items-start gap-1 text-left"
									onClick={action.action}
								>
									<div className="flex items-center gap-2 w-full">
										<action.icon className="h-3.5 w-3.5" />
										<span className="font-medium text-sm">{action.label}</span>
									</div>
									<p className="text-xs text-muted-foreground text-left w-full leading-tight">
										{action.description}
									</p>
								</Button>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<CompareModal repoPath={repoPath} open={showCompareModal} onOpenChange={setShowCompareModal} />
		</>
	);
}
