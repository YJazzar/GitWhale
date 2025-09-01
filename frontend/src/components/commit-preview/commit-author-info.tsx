import { convertUnixTimeToDate } from '@/hooks/utils/use-unix-time';
import { Calendar, Clock, Hash, User } from 'lucide-react';
import { git_operations } from 'wailsjs/go/models';

interface CommitAuthorInfoProps {
	commit: git_operations.DetailedCommitInfo;
}

export function CommitAuthorInfo({ commit }: CommitAuthorInfoProps) {
	return (
		<div className="space-y-3">
			<div className="grid grid-cols-4 gap-4">
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<User className="w-4 h-4" />
						<span className="font-medium">Author</span>
					</div>
					<div className="pl-6 space-y-1">
						<div className="font-mono text-sm">{commit.username}</div>
						<div className="text-xs text-muted-foreground">{commit.userEmail}</div>
					</div>
				</div>
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Calendar className="w-4 h-4" />
						<span className="font-medium">Author Date</span>
					</div>
					<div className="pl-6">
						<div className="text-sm">
							{convertUnixTimeToDate(commit.authoredTimeStamp).toLocaleDateString()}
						</div>
						<div className="text-xs text-muted-foreground">
							{convertUnixTimeToDate(commit.authoredTimeStamp).toLocaleTimeString()}
						</div>
					</div>
				</div>
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Hash className="w-4 h-4" />
						<span className="font-medium">Committer</span>
					</div>
					<div className="pl-6 space-y-1">
						<div className="font-mono text-sm">{commit.committerName || commit.username}</div>
						<div className="text-xs text-muted-foreground">{commit.committerEmail || commit.userEmail}</div>
					</div>
				</div>
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Clock className="w-4 h-4" />
						<span className="font-medium">Commit Date</span>
					</div>
					<div className="pl-6">
						<div className="text-sm">
							{convertUnixTimeToDate(commit.commitTimeStamp).toLocaleDateString()}
						</div>
						<div className="text-xs text-muted-foreground">
							{convertUnixTimeToDate(commit.commitTimeStamp).toLocaleTimeString()}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}