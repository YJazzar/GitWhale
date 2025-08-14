import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { useSidebarContext } from '@/hooks/state/use-sidebar-context';
import {
	Eye,
	FolderOpen,
	GitCompare,
	Search,
	Terminal
} from 'lucide-react';
import { useState } from 'react';
import { CompareModal } from '../git-log/compare-modal';

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
				setShowCompareModal(true);
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
				</CardContent>
			</Card>

			<CompareModal repoPath={repoPath} open={showCompareModal} onOpenChange={setShowCompareModal} />
		</>
	);
}
