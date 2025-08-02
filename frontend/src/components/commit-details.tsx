import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUnixTime } from '@/hooks/use-unix-time';
import { Calendar, ExternalLink, Hash, User } from 'lucide-react';
import { backend } from 'wailsjs/go/models';
import { CommitHash } from './commit-hash';
import { useNavigateToCommit } from '@/hooks/use-navigate-to-commit';
import { GitRefs } from './git-refs';

interface CommitDetailsProps {
	commit: backend.GitLogCommitInfo;
	onClose?: () => void;
}

export function CommitDetails({ commit, onClose }: CommitDetailsProps) {
	const commitMessage = Array.isArray(commit.commitMessage)
		? commit.commitMessage.join('\n')
		: commit.commitMessage;


    let isMergeCommit = commit.parentCommitHashes.length > 1;
    const handleViewFullCommit = useNavigateToCommit(commit.commitHash, isMergeCommit);

	return (
		<div className="h-full flex flex-col border-t bg-background">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex-1 min-w-0">
						<CardTitle className="text-lg flex items-center gap-2">
							<div className="mt-2">
								<CommitHash
									commitHash={commit.commitHash}
									isMerge={commit.parentCommitHashes.length > 1}
								/>
							</div>
						</CardTitle>
					</div>
					<div className="flex flex-col items-end gap-2">
						{/* Action Buttons */}
						<div className="flex items-center gap-2 mt-2">
							<Button onClick={handleViewFullCommit} size="sm">
								<ExternalLink className="w-4 h-4 mr-2" />
								View Full Commit
							</Button>
							{onClose && (
								<Button onClick={onClose} variant="outline" size="sm">
									Close
								</Button>
							)}
						</div>
					</div>
				</div>
			</CardHeader>

			<ScrollArea className="flex-1">
				<CardContent className="space-y-4">
					<div className="space-y-1 text-sm text-right">
						{/* Author  */}
						<div className="flex items-center gap-2">
							<User className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium">Author:</span>
							<span>{commit.username}</span>
						</div>

						{/* Parent Commits */}
						{commit.parentCommitHashes.length > 0 && (
							<div className="flex items-center gap-2">
								<Hash className="w-4 h-4 text-muted-foreground" />
								<span className="font-medium">Parent Commits:</span>
								<span className="flex items-center gap-2">
									{commit.parentCommitHashes.map((parentHash, index) => (
										<CommitHash
											key={index}
											commitHash={parentHash}
											shortHash={true}
											showIcon={false}
											className="flex-1"
										/>
									))}
								</span>
							</div>
						)}

						{/* Commit date */}
						<div className="flex items-center gap-2">
							<Calendar className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium">Commit Date:</span>
							<span>{useUnixTime(commit.commitTimeStamp).toLocaleString()}</span>
						</div>

						<div className="flex items-center gap-2">
							<Calendar className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium">Authored Date:</span>
							<span>{useUnixTime(commit.authoredTimeStamp).toLocaleString()}</span>
						</div>
					</div>

					{/* Commit Message */}
					<div>
						<h3 className="font-semibold mb-2">Message</h3>
						<Card>
							<CardContent className="p-3">
								<pre className="font-mono text-sm whitespace-pre-wrap">{commitMessage}</pre>
							</CardContent>
						</Card>
					</div>

					{/* Refs (branches and tags) */}
					{commit.refs && commit.refs.trim() !== '' && (
						<div>
							<h3 className="font-semibold mb-2">Branches & Tags</h3>
							<GitRefs refs={commit.refs} size="md" showHead={true} />
						</div>
					)}

					{/* File Statistics */}
					{commit.shortStat && (
						<div>
							<h3 className="font-semibold mb-2">Changes Summary</h3>
							<Card>
								<CardContent className="p-3">
									<code className="text-sm font-mono">{commit.shortStat}</code>
								</CardContent>
							</Card>
						</div>
					)}
				</CardContent>
			</ScrollArea>
		</div>
	);
}

