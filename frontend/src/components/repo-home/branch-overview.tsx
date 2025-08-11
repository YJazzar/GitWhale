import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { GitBranch } from 'lucide-react';
import { QuickRepoData } from './types';

interface BranchOverviewProps {
	branches: QuickRepoData['branches'];
}

export function BranchOverview({ branches }: BranchOverviewProps) {
	const sortedBranches = branches.sort((a, b) => 
		a.isActive ? -1 : b.isActive ? 1 : b.lastCommitDate.getTime() - a.lastCommitDate.getTime()
	);

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-lg">
					<GitBranch className="h-4 w-4" />
					Branches
				</CardTitle>
				<CardDescription className="text-sm">Recent branch activity</CardDescription>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="space-y-1.5">
					{sortedBranches.map((branch, index) => (
						<div 
							key={index} 
							className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50 ${
								branch.isActive ? 'bg-primary/5 border border-primary/20' : ''
							}`}
						>
							<div className="flex items-center gap-2">
								<GitBranch className={`h-3.5 w-3.5 ${branch.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
								<span className={`text-sm font-medium font-mono ${branch.isActive ? 'text-primary' : ''}`}>
									{branch.name}
								</span>
								{branch.isActive && (
									<Badge variant="secondary" className="text-xs px-1.5 py-0">
										current
									</Badge>
								)}
							</div>
							<span className="text-xs text-muted-foreground">
								{branch.lastCommitDate.toLocaleDateString()}
							</span>
						</div>
					))}
				</div>

				<Separator className="my-3" />
				
				<Button variant="ghost" className="w-full" size="sm">
					<GitBranch className="h-3.5 w-3.5 mr-2" />
					Manage Branches
				</Button>
			</CardContent>
		</Card>
	);
}