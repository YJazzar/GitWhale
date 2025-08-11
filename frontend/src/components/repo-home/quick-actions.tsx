import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Eye,
	GitCompare,
	Search,
	Terminal,
	Zap,
} from 'lucide-react';

interface QuickActionsProps {
	repoPath: string;
}

export function QuickActions({ repoPath }: QuickActionsProps) {
	const actions = [
		{
			icon: Eye,
			label: 'View Log',
			description: 'Browse commit history',
			action: () => {/* Navigate to log view */},
			primary: true,
		},
		{
			icon: GitCompare,
			label: 'Compare',
			description: 'Compare branches or commits',
			action: () => {/* Open compare dialog */},
		},
		{
			icon: Search,
			label: 'Search',
			description: 'Find commits or files',
			action: () => {/* Focus search */},
		},
		{
			icon: Terminal,
			label: 'Terminal',
			description: 'Open in terminal',
			action: () => {/* Open terminal */},
		},
	];

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-lg">
					<Zap className="h-4 w-4" />
					Quick Actions
				</CardTitle>
				<CardDescription className="text-sm">Common tasks to get started</CardDescription>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
					{actions.map((action, index) => (
						<Button
							key={index}
							variant={action.primary ? "default" : "outline"}
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
	);
}