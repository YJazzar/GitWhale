import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { SidebarSessionKeyGenerator, useSidebarHandlers } from '@/hooks/state/useSidebarHandlers';
import { Eye, FolderOpen, GitCompare, RefreshCw, Search, Terminal } from 'lucide-react';
import { useState } from 'react';
import { CompareModal } from '../git-log/compare-modal';

interface QuickActionsProps {
	repoPath: string;
	onRefresh?: () => void;
	isRefreshing?: boolean;
}

export function QuickActions(props: QuickActionsProps) {
	const { repoPath, onRefresh, isRefreshing } = props;
	const sidebar = useSidebarHandlers(SidebarSessionKeyGenerator.repoSidebar(repoPath));
	const repoState = useRepoState(repoPath);

	const [showCompareModal, setShowCompareModal] = useState(false);

	const actions = [
		{
			icon: Eye,
			label: 'View Log',
			action: () => {
				/* Navigate to log view */
				sidebar.setActiveItem('log');
			},
		},
		{
			icon: GitCompare,
			label: 'Compare',
			action: () => {
				setShowCompareModal(true);
			},
		},
		{
			icon: Search,
			label: 'Search',
			action: () => {
				/* Focus search */
			},
		},
		{
			icon: Terminal,
			label: 'Terminal',
			action: () => {
				/* Open terminal */
				sidebar.setActiveItem('terminal');
			},
		},
	];

	return (
		<>
			<Card className="flex-shrink">
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center justify-between text-lg">
						<div className="flex items-center gap-2 min-w-0 flex-1">
							<FolderOpen className="h-4 w-4 text-blue-500 shrink-0" />
							<span className="truncate">{repoPath}</span>
							<CopyButton
								text={repoPath}
								title="Copy repository path"
								successTitle="Repository path copied!"
								className="shrink-0"
							/>
						</div>
						{onRefresh && (
							<Button
								variant="ghost"
								size="sm"
								onClick={onRefresh}
								disabled={isRefreshing}
								className="h-8 w-8 p-0 shrink-0 hover:bg-muted"
							>
								<RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
								<span className="sr-only">Refresh</span>
							</Button>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-0">
					<div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
						{actions.map((action, index) => (
							<Button
								key={index}
								variant={'outline'}
								className="h-auto p-3 flex-col items-center justify-center gap-1 text-left"
								onClick={action.action}
							>
								<div className="flex items-center justify-center gap-2 w-full">
									<action.icon className="h-3.5 w-3.5" />
									<span className="font-medium text-sm">{action.label}</span>
								</div>
							</Button>
						))}
					</div>
				</CardContent>
			</Card>

			<CompareModal repoPath={repoPath} open={showCompareModal} onOpenChange={setShowCompareModal} />
		</>
	);
}
