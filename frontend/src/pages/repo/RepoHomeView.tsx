import { CommitHash } from '@/components/commit-hash';
import { GitRefs } from '@/components/git-refs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useRepoState } from '@/hooks/state/use-repo-state';
import { Logger } from '@/utils/logger';
import {
	Clock,
	Copy,
	ExternalLink,
	FileText,
	Folder,
	GitBranch,
	GitCommit,
	GitPullRequest,
	Star,
	Tag,
	Terminal,
	TrendingUp,
	Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { git_operations } from 'wailsjs/go/models';
import { GetAllRefs } from '../../../wailsjs/go/backend/App';

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

	// Get repository name from path
	const repoName = repoPath.split(/[/\\]/).pop() || 'Repository';

	if (!repoPath) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Error: No repository path provided</p>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6 max-w-7xl mx-auto">
			hi there. Showing {repoName}
		</div>
	);
}
