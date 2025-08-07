import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
	GitBranch,
	GitCommit,
	Tag,
	Users,
	FileText,
	Clock,
	TrendingUp,
	Copy,
	ExternalLink,
	Terminal,
	GitPullRequest,
	Star,
	Folder,
} from 'lucide-react';
import { backend } from 'wailsjs/go/models';
import { RunGitLog, GetBranches, GetTags } from '../../../wailsjs/go/backend/App';
import { GitRefs } from '@/components/git-refs';
import { CommitHash } from '@/components/commit-hash';
import { useRepoState } from '@/hooks/state/use-repo-state';
import { Logger } from '@/utils/logger';

interface RepoStats {
	commitCount: number;
	branchCount: number;
	tagCount: number;
	contributors: string[];
	lastActivity: Date | null;
}

interface RepoHomeViewProps {
	repoPath: string;
}

export default function RepoHomeView({ repoPath }: RepoHomeViewProps) {
	const repoState = useRepoState(repoPath);
	const [recentCommits, setRecentCommits] = useState<backend.GitLogCommitInfo[]>([]);
	const [branches, setBranches] = useState<backend.GitRef[]>([]);
	const [tags, setTags] = useState<backend.GitRef[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Compute repository statistics
	const repoStats = useMemo((): RepoStats => {
		const contributors = Array.from(new Set(recentCommits.map((commit) => commit.username)));
		const lastActivity = recentCommits.length > 0 ? new Date(recentCommits[0].commitTimeStamp) : null;

		return {
			commitCount: recentCommits.length,
			branchCount: branches.length,
			tagCount: tags.length,
			contributors,
			lastActivity,
		};
	}, [recentCommits, branches, tags]);

	// Extract current branch from branches
	const currentBranch = branches.find((branch) => branch.isHead)?.name || 'main';

	// Get repository name from path
	const repoName = repoPath.split(/[/\\]/).pop() || 'Repository';

	useEffect(() => {
		if (!repoPath) return;

		const fetchRepoData = async () => {
			setLoading(true);
			setError(null);

			try {
				// Fetch data in parallel for better performance
				const [ branchesData, tagsData] = await Promise.all([
					// RunGitLog(repoPath),
					GetBranches(repoPath),
					GetTags(repoPath),
				]);

				// Limit to recent commits for home view
				// setRecentCommits(commitsData.slice(0, 20));
				setBranches(branchesData);
				setTags(tagsData);
			} catch (err) {
				const errorMessage = `Failed to load repository data: ${err}`;
				Logger.error(errorMessage, 'RepoHomeView');
				setError(errorMessage);
			} finally {
				setLoading(false);
			}
		};

		fetchRepoData();
	}, [repoPath]);

	const handleCopyRepoPath = async () => {
		try {
			await navigator.clipboard.writeText(repoPath);
		} catch (err) {
			Logger.error('Failed to copy repository path', 'RepoHomeView');
		}
	};

	if (!repoPath) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Error: No repository path provided</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6">
				<Card className="border-red-200 dark:border-red-800">
					<CardContent className="pt-6">
						<div className="flex items-center gap-2 text-red-600 dark:text-red-400">
							<span className="font-medium">Failed to load repository</span>
						</div>
						<p className="text-sm text-muted-foreground mt-2">{error}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6 max-w-7xl mx-auto">
			{/* Hero Section */}
			<div className="space-y-4">
				<div className="flex items-start justify-between">
					<div className="space-y-2">
						<div className="flex items-center gap-3">
							<Folder className="w-8 h-8 text-primary" />
							<div>
								<h1 className="text-3xl font-bold tracking-tight">{repoName}</h1>
								<p className="text-muted-foreground font-mono text-sm">{repoPath}</p>
							</div>
						</div>

						{!loading && (
							<div className="flex items-center gap-4 mt-3">
								<div className="flex items-center gap-2">
									<GitBranch className="w-4 h-4" />
									<Badge variant="outline">{currentBranch}</Badge>
								</div>
								{repoStats.lastActivity && (
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Clock className="w-4 h-4" />
										<span>
											Last activity {repoStats.lastActivity.toLocaleDateString()}
										</span>
									</div>
								)}
							</div>
						)}
					</div>

					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={handleCopyRepoPath} className="gap-2">
							<Copy className="w-4 h-4" />
							Copy Path
						</Button>
						<Button variant="outline" size="sm" className="gap-2">
							<Terminal className="w-4 h-4" />
							Terminal
						</Button>
						<Button variant="outline" size="sm" className="gap-2">
							<ExternalLink className="w-4 h-4" />
							Open
						</Button>
					</div>
				</div>

				<Separator />
			</div>

			{/* Recent Activity Card - Full Width Horizontal */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<GitCommit className="w-5 h-5" />
						Recent Activity
					</CardTitle>
					<CardDescription>Latest commits to this repository</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="flex gap-4 overflow-x-auto pb-2">
							{[...Array(5)].map((_, i) => (
								<div key={i} className="flex-shrink-0">
									<Skeleton className="h-16 w-80" />
								</div>
							))}
						</div>
					) : (
						<>
							{recentCommits.length > 0 ? (
								<div className="flex gap-4 overflow-x-auto pb-2">
									{recentCommits.slice(0, 8).map((commit) => (
										<div
											key={commit.commitHash}
											className="flex-shrink-0 bg-muted/30 rounded-lg p-3 min-w-[320px] border border-border/50 hover:border-border transition-colors"
										>
											<div className="flex items-start gap-3">
												<div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium line-clamp-1 mb-1">
														{commit.commitMessage[0]}
													</p>
													<div className="flex items-center gap-2 mb-2">
														<CommitHash
															repoPath={repoPath}
															commitHash={commit.commitHash}
															shortHash
														/>
														<span className="text-xs text-muted-foreground">
															{commit.username}
														</span>
													</div>
													<div className="flex items-center justify-between">
														<span className="text-xs text-muted-foreground">
															{new Date(commit.commitTimeStamp).toLocaleDateString()}
														</span>
														{commit.refs && (
															<div className="flex-shrink-0">
																<GitRefs refs={commit.refs} />
															</div>
														)}
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground text-center py-8">
									No recent commits found
								</p>
							)}
						</>
					)}
				</CardContent>
			</Card>

			{/* Overview Cards Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				
				{/* Repository Stats Card - Standalone */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<TrendingUp className="w-5 h-5" />
							Repository Stats
						</CardTitle>
						<CardDescription>Overview of repository metrics</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{loading ? (
							<>
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-2/3" />
								<Skeleton className="h-4 w-1/2" />
							</>
						) : (
							<>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<GitCommit className="w-4 h-4 text-muted-foreground" />
										<span className="text-sm">Commits</span>
									</div>
									<span className="font-medium">{repoStats.commitCount}</span>
								</div>

								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<GitBranch className="w-4 h-4 text-muted-foreground" />
										<span className="text-sm">Branches</span>
									</div>
									<span className="font-medium">{repoStats.branchCount}</span>
								</div>

								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Tag className="w-4 h-4 text-muted-foreground" />
										<span className="text-sm">Tags</span>
									</div>
									<span className="font-medium">{repoStats.tagCount}</span>
								</div>

								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Users className="w-4 h-4 text-muted-foreground" />
										<span className="text-sm">Contributors</span>
									</div>
									<span className="font-medium">{repoStats.contributors.length}</span>
								</div>

								{repoStats.contributors.length > 0 && (
									<div className="pt-2">
										<p className="text-xs text-muted-foreground mb-2">
											Recent Contributors
										</p>
										<div className="flex flex-wrap gap-1">
											{repoStats.contributors.slice(0, 3).map((contributor) => (
												<Badge
													key={contributor}
													variant="secondary"
													className="text-xs"
												>
													{contributor}
												</Badge>
											))}
											{repoStats.contributors.length > 3 && (
												<Badge variant="outline" className="text-xs">
													+{repoStats.contributors.length - 3} more
												</Badge>
											)}
										</div>
									</div>
								)}
							</>
						)}
					</CardContent>
				</Card>

				{/* Branch Overview Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<GitBranch className="w-5 h-5" />
							Branches
						</CardTitle>
						<CardDescription>Branch information and status</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{loading ? (
							<>
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-2/3" />
							</>
						) : (
							<>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">Current Branch</span>
									<Badge variant="default">{currentBranch}</Badge>
								</div>

								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">Total Branches</span>
									<span className="text-sm font-medium">{repoStats.branchCount}</span>
								</div>

								{branches.slice(0, 4).map((branch) => (
									<div key={branch.hash} className="flex items-center justify-between py-1">
										<div className="flex items-center gap-2">
											<div
												className={`w-2 h-2 rounded-full ${
													branch.isHead ? 'bg-green-500' : 'bg-muted'
												}`}
											/>
											<span className="text-sm truncate">{branch.name}</span>
										</div>
										{branch.isHead && (
											<Badge variant="secondary" className="text-xs">
												HEAD
											</Badge>
										)}
									</div>
								))}

								{branches.length > 4 && (
									<p className="text-xs text-muted-foreground text-center">
										+{branches.length - 4} more branches
									</p>
								)}
							</>
						)}
					</CardContent>
				</Card>


				{/* Quick Actions Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<GitPullRequest className="w-5 h-5" />
							Quick Actions
						</CardTitle>
						<CardDescription>Common repository operations</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						<Button variant="outline" className="w-full justify-start gap-2" size="sm">
							<GitPullRequest className="w-4 h-4" />
							Create Pull Request
						</Button>
						<Button variant="outline" className="w-full justify-start gap-2" size="sm">
							<GitBranch className="w-4 h-4" />
							New Branch
						</Button>
						<Button variant="outline" className="w-full justify-start gap-2" size="sm">
							<Tag className="w-4 h-4" />
							Create Tag
						</Button>
						<Button variant="outline" className="w-full justify-start gap-2" size="sm">
							<Terminal className="w-4 h-4" />
							Open Terminal
						</Button>
					</CardContent>
				</Card>

				{/* Tags & Releases Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Tag className="w-5 h-5" />
							Tags & Releases
						</CardTitle>
						<CardDescription>Recent tags and version information</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{loading ? (
							<>
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-2/3" />
							</>
						) : (
							<>
								{tags.length > 0 ? (
									<>
										{tags.slice(0, 5).map((tag) => (
											<div
												key={tag.hash}
												className="flex items-center justify-between py-1"
											>
												<div className="flex items-center gap-2">
													<Star className="w-3 h-3 text-yellow-500" />
													<span className="text-sm font-medium">{tag.name}</span>
												</div>
												<CommitHash repoPath={repoPath} commitHash={tag.hash} shortHash />
											</div>
										))}
										{tags.length > 5 && (
											<p className="text-xs text-muted-foreground text-center">
												+{tags.length - 5} more tags
											</p>
										)}
									</>
								) : (
									<p className="text-sm text-muted-foreground text-center py-4">
										No tags found
									</p>
								)}
							</>
						)}
					</CardContent>
				</Card>

				{/* File System Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileText className="w-5 h-5" />
							File System
						</CardTitle>
						<CardDescription>Recent file changes and structure</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{loading ? (
							<>
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-4 w-1/2" />
							</>
						) : (
							<>
								{recentCommits.slice(0, 4).map((commit) => (
									<div
										key={commit.commitHash}
										className="flex items-center justify-between py-1"
									>
										<div className="flex items-center gap-2 flex-1 min-w-0">
											<FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
											<span className="text-sm truncate">
												{commit.commitMessage[0]}
											</span>
										</div>
										<span className="text-xs text-muted-foreground">
											{new Date(commit.commitTimeStamp).toLocaleDateString()}
										</span>
									</div>
								))}

								{recentCommits.length === 0 && (
									<p className="text-sm text-muted-foreground text-center py-4">
										No recent file changes
									</p>
								)}
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
