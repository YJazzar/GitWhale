import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { backend } from 'wailsjs/go/models';
import { useNavigate } from 'react-router';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';
import { GitBranch, User, Calendar, Hash, ExternalLink } from 'lucide-react';
import { CommitHash } from './commit-hash';

interface CommitDetailsProps {
	commit: backend.GitLogCommitInfo;
	onClose?: () => void;
}

export function CommitDetails({ commit, onClose }: CommitDetailsProps) {
	const navigate = useNavigate();
	const { encodedRepoPath } = useCurrentRepoParams();

	const commitUrl = `/repo/${encodedRepoPath}/commit/${commit.commitHash}`;
	const commitMessage = Array.isArray(commit.commitMessage)
		? commit.commitMessage.join('\n')
		: commit.commitMessage;

	// Parse refs to identify branches and tags
	const refs = parseRefs(commit.refs);

	const handleViewFullCommit = () => {
		navigate(commitUrl);
	};

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
					{/* Author and Date */}
					<div className="space-y-1 text-sm text-right">
						<div className="flex items-center gap-2">
							<User className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium">Author:</span>
							<span>{commit.username}</span>
						</div>
						<div className="flex items-center gap-2">
							<Calendar className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium">Date:</span>
							<span>{new Date(commit.commitTimeStamp).toLocaleString()}</span>
						</div>
					</div>

					{/* Parent Commits */}
					{commit.parentCommitHashes.length > 0 && (
						<div>
							<h3 className="font-semibold mb-2">Parent Commits</h3>
							<Card>
								<CardContent className="p-3">
									<div className="space-y-2">
										{commit.parentCommitHashes.map((parentHash, index) => (
											<div key={index} className="flex items-center gap-2">
												<Hash className="w-4 h-4 text-muted-foreground" />
												<CommitHash 
													commitHash={parentHash}
													shortHash={true}
													showIcon={false}
													className="flex-1"
												/>
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						</div>
					)}

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
					{(refs.branches.length > 0 || refs.tags.length > 0) && (
						<div>
							<h3 className="font-semibold mb-2">Branches & Tags</h3>
							<div className="flex items-center gap-2 flex-wrap">
								{refs.branches.map((branch, index) => (
									<Badge key={index} variant="secondary" className="text-xs">
										<GitBranch className="w-3 h-3 mr-1" />
										{branch}
									</Badge>
								))}
								{refs.tags.map((tag, index) => (
									<Badge key={index} variant="outline" className="text-xs">
										{tag}
									</Badge>
								))}
							</div>
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

interface ParsedRefs {
	branches: string[];
	tags: string[];
}

function parseRefs(refs: string): ParsedRefs {
	if (!refs || refs.trim() === '') {
		return { branches: [], tags: [] };
	}

	const branches: string[] = [];
	const tags: string[] = [];

	// Parse refs like "(origin/main, main)" or "(tag: v1.0.0)"
	const refParts = refs
		.replace(/[()]/g, '')
		.split(',')
		.map((r) => r.trim());

	for (const ref of refParts) {
		if (ref.startsWith('tag:')) {
			tags.push(ref.substring(4).trim());
		} else if ((ref && !ref.includes('/')) || ref.startsWith('origin/')) {
			branches.push(ref);
		}
	}

	return { branches, tags };
}
