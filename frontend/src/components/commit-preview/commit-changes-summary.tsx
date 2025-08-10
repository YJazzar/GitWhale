import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus } from 'lucide-react';
import { git_operations } from 'wailsjs/go/models';

interface CommitChangesSummaryProps {
	commit: git_operations.DetailedCommitInfo;
}

export function CommitChangesSummary({ commit }: CommitChangesSummaryProps) {
	return (
		<>
			<Separator />
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h4 className="text-sm font-medium text-muted-foreground">Changes Summary</h4>
					<div className="flex items-center gap-3 text-sm">
						<Badge variant="secondary">
							{commit.commitStats.filesChanged} files
						</Badge>
						<Badge variant="outline" className="text-green-600 border-green-200">
							<Plus className="w-3 h-3 mr-1" />
							{commit.commitStats.linesAdded}
						</Badge>
						<Badge variant="outline" className="text-red-600 border-red-200">
							<Minus className="w-3 h-3 mr-1" />
							{commit.commitStats.linesDeleted}
						</Badge>
					</div>
				</div>

				{/* Short Stat */}
				{commit.shortStat && (
					<div className="text-xs text-muted-foreground font-mono bg-muted/50 px-3 py-2 rounded">
						{commit.shortStat}
					</div>
				)}
			</div>
		</>
	);
}