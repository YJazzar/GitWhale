import { Badge } from '@/components/ui/badge';
import { GitBranch, Tag } from 'lucide-react';

interface ParsedRefs {
	localBranches: string[];
	remoteBranches: string[];
	tags: string[];
	head: string | null;
}

export function parseRefs(refs: string): ParsedRefs {
	if (!refs || refs.trim() === '') {
		return { localBranches: [], remoteBranches: [], tags: [], head: null };
	}

	const localBranches: string[] = [];
	const remoteBranches: string[] = [];
	const tags: string[] = [];
	let head: string | null = null;

	// Parse refs like "(HEAD -> main, origin/main, origin/HEAD)" or "(tag: v1.0.0, main)"
	const refParts = refs
		.replace(/[()]/g, '')
		.split(',')
		.map((r) => r.trim())
		.filter(r => r.length > 0);

	for (const ref of refParts) {
		if (ref.startsWith('tag:')) {
			// Handle tags like "tag: v1.0.0"
			tags.push(ref.substring(4).trim());
		} else if (ref.startsWith('HEAD ->')) {
			// Handle "HEAD -> branch-name"
			const branchName = ref.substring(7).trim();
			head = branchName;
			if (!localBranches.includes(branchName)) {
				localBranches.push(branchName);
			}
		} else if (ref.includes('/')) {
			// Handle remote refs like "origin/main", "upstream/develop"
			if (!remoteBranches.includes(ref)) {
				remoteBranches.push(ref);
			}
		} else if (ref && ref !== 'HEAD') {
			// Handle local branch refs
			if (!localBranches.includes(ref)) {
				localBranches.push(ref);
			}
		}
	}

	return { localBranches, remoteBranches, tags, head };
}

interface GitRefsProps {
	refs: string;
	showHead?: boolean;
	size?: 'sm' | 'md';
}

export function GitRefs({ refs, showHead = true, size = 'sm' }: GitRefsProps) {
	const parsedRefs = parseRefs(refs);
	const hasAnyRefs = parsedRefs.localBranches.length > 0 || 
					  parsedRefs.remoteBranches.length > 0 || 
					  parsedRefs.tags.length > 0 || 
					  (showHead && parsedRefs.head);

	if (!hasAnyRefs) {
		return null;
	}

	const badgeSize = size === 'sm' ? 'text-xs' : 'text-sm';
	const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

	return (
		<div className="flex gap-1 flex-wrap items-center">
			{/* HEAD indicator */}
			{showHead && parsedRefs.head && (
				<Badge
					variant="default"
					className={`${badgeSize} shrink-0 bg-orange-500 hover:bg-orange-600 text-white border-orange-500`}
				>
					HEAD
				</Badge>
			)}
			
			{/* Local branches */}
			{parsedRefs.localBranches.map((branch, index) => (
				<Badge
					key={`local-${index}`}
					variant="secondary"
					className={`${badgeSize} shrink-0 bg-green-100 text-green-800 border-green-200 hover:bg-green-200`}
				>
					<GitBranch className={`${iconSize} mr-1`} />
					{branch}
				</Badge>
			))}
			
			{/* Remote branches */}
			{parsedRefs.remoteBranches.map((branch, index) => (
				<Badge
					key={`remote-${index}`}
					variant="outline"
					className={`${badgeSize} shrink-0 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100`}
				>
					<GitBranch className={`${iconSize} mr-1`} />
					{branch}
				</Badge>
			))}
			
			{/* Tags */}
			{parsedRefs.tags.map((tag, index) => (
				<Badge
					key={`tag-${index}`}
					variant="outline"
					className={`${badgeSize} shrink-0 bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100`}
				>
					<Tag className={`${iconSize} mr-1`} />
					{tag}
				</Badge>
			))}
		</div>
	);
}