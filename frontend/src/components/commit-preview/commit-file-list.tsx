import { Badge } from '@/components/ui/badge';
import { Copy, Edit, FileText, Minus, Plus, Trash2 } from 'lucide-react';
import { git_operations } from 'wailsjs/go/models';

interface CommitFileListProps {
	commit: git_operations.DetailedCommitInfo;
}

export function CommitFileList({ commit }: CommitFileListProps) {
	if (!commit.changedFiles || commit.changedFiles.length === 0) return null;

	const getFileStatusInfo = (status: string) => {
		switch (status) {
			case 'A':
				return {
					label: 'Added',
					icon: Plus,
					color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
				};
			case 'M':
				return {
					label: 'Modified',
					icon: Edit,
					color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
				};
			case 'D':
				return {
					label: 'Deleted',
					icon: Trash2,
					color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
				};
			case 'R':
				return {
					label: 'Renamed',
					icon: Edit,
					color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
				};
			case 'C':
				return {
					label: 'Copied',
					icon: Copy,
					color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
				};
			default:
				return {
					label: status,
					icon: FileText,
					color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
				};
		}
	};

	return (
		<div className="space-y-3">
			<div className='flex'>
				<h4 className="text-sm font-medium text-muted-foreground flex-grow">Files Changed</h4>
				<div className="flex items-center gap-3 text-sm">
					<Badge variant="secondary">{commit.commitStats.filesChanged} files</Badge>
					<Badge variant="outline" className="text-green-600 border-green-600">
						<Plus className="w-3 h-3 mr-1" />
						{commit.commitStats.linesAdded}
					</Badge>
					<Badge variant="outline" className="text-red-600 border-red-600">
						<Minus className="w-3 h-3 mr-1" />
						{commit.commitStats.linesDeleted}
					</Badge>
				</div>
			</div>
			<div className="space-y-2">
				{commit.changedFiles.map((file, index) => {
					const statusInfo = getFileStatusInfo(file.status);
					const StatusIcon = statusInfo.icon;

					return (
						<div
							key={index}
							className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
						>
							<div className="flex items-center gap-3 flex-1 min-w-0">
								<Badge
									variant="outline"
									className={`flex items-center gap-1 ${statusInfo.color} border-0 font-mono text-xs px-2 py-1`}
								>
									<StatusIcon className="w-3 h-3" />
									{file.status}
								</Badge>

								<div className="flex-1 min-w-0">
									<div className="font-mono text-sm truncate">{file.path}</div>
									{file.oldPath && file.oldPath !== file.path && (
										<div className="text-xs text-muted-foreground font-mono">
											from: {file.oldPath}
										</div>
									)}
								</div>

								{file.binaryFile && (
									<Badge variant="secondary" className="text-xs">
										Binary
									</Badge>
								)}
							</div>

							{!file.binaryFile && (
								<div className="flex items-center gap-2 text-xs font-mono">
									<span className="text-green-600 flex items-center gap-1">
										<Plus className="w-3 h-3" />
										{file.linesAdded}
									</span>
									<span className="text-red-600 flex items-center gap-1">
										<Minus className="w-3 h-3" />
										{file.linesDeleted}
									</span>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
