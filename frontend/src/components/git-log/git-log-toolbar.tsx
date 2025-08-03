import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	RefreshCw,
	GitBranch,
	Tag,
	Download,
	Search,
	Settings,
	ChevronDown,
	Filter,
	GitCompare,
} from 'lucide-react';
import { backend } from 'wailsjs/go/models';
import {
	GetBranches,
	GetTags,
	GitFetch,
	RunGitLogWithOptions,
	RunGitLogFromRef,
	SearchCommits,
} from '../../../wailsjs/go/backend/App';

interface GitLogToolbarProps {
	repoPath: string;
	onCommitsUpdate: (commits: backend.GitLogCommitInfo[]) => void;
	loading: boolean;
	onLoadingChange: (loading: boolean) => void;
	currentRef: string;
	onRefChange: (ref: string) => void;
	onCompareRefs?: (fromRef: string, toRef: string) => void;
}

interface GitLogOptions {
	commitsToLoad: number;
	fromRef: string;
	toRef: string;
	includeMerges: boolean;
	searchQuery: string;
	author: string;
}

// Fetch Dropdown Component
function FetchDropdown({
	loading,
	onFetch,
	fetchRemote,
	setFetchRemote,
	fetchRef,
	setFetchRef,
}: {
	loading: boolean;
	onFetch: () => void;
	fetchRemote: string;
	setFetchRemote: (value: string) => void;
	fetchRef: string;
	setFetchRef: (value: string) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" disabled={loading}>
					<Download className="w-4 h-4 mr-2" />
					Fetch
					<ChevronDown className="w-4 h-4 ml-2" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>Fetch from Remote</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<div className="p-2 space-y-2">
					<div>
						<Label htmlFor="remote">Remote</Label>
						<Input
							id="remote"
							value={fetchRemote}
							onChange={(e) => setFetchRemote(e.target.value)}
							placeholder="origin"
							className="h-8"
						/>
					</div>
					<div>
						<Label htmlFor="ref">Ref (optional)</Label>
						<Input
							id="ref"
							value={fetchRef}
							onChange={(e) => setFetchRef(e.target.value)}
							placeholder="main, feature/*, etc."
							className="h-8"
						/>
					</div>
					<Button onClick={onFetch} size="sm" className="w-full">
						Fetch
					</Button>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// Ref Selector Dropdown Component
function RefSelectorDropdown({
	loading,
	currentRef,
	branches,
	tags,
	onRefChange,
}: {
	loading: boolean;
	currentRef: string;
	branches: backend.GitRef[];
	tags: backend.GitRef[];
	onRefChange: (ref: string) => void;
}) {
	const getCurrentRefDisplay = () => {
		if (!currentRef) return 'HEAD';
		return currentRef.length > 20 ? `${currentRef.substring(0, 20)}...` : currentRef;
	};

	const localBranches = branches.filter((b) => b.type === 'local');
	const remoteBranches = branches.filter((b) => b.type === 'remote');

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" disabled={loading}>
					<GitBranch className="w-4 h-4 mr-2" />
					{getCurrentRefDisplay()}
					<ChevronDown className="w-4 h-4 ml-2" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-64">
				<DropdownMenuLabel>Switch Reference</DropdownMenuLabel>
				<DropdownMenuSeparator />

				{localBranches.length > 0 && (
					<>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<GitBranch className="w-4 h-4 mr-2" />
								Local Branches
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								{localBranches.map((branch) => (
									<DropdownMenuItem
										key={branch.name}
										onClick={() => onRefChange(branch.name)}
										className={branch.isHead ? 'bg-accent' : ''}
									>
										<span className={branch.isHead ? 'font-bold' : ''}>
											{branch.name}
										</span>
										{branch.isHead && (
											<span className="ml-2 text-xs text-muted-foreground">
												(current)
											</span>
										)}
									</DropdownMenuItem>
								))}
							</DropdownMenuSubContent>
						</DropdownMenuSub>
						<DropdownMenuSeparator />
					</>
				)}

				{remoteBranches.length > 0 && (
					<>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<GitBranch className="w-4 h-4 mr-2" />
								Remote Branches
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								{remoteBranches.map((branch) => (
									<DropdownMenuItem
										key={branch.name}
										onClick={() => onRefChange(branch.name)}
									>
										{branch.name}
									</DropdownMenuItem>
								))}
							</DropdownMenuSubContent>
						</DropdownMenuSub>
						<DropdownMenuSeparator />
					</>
				)}

				{tags.length > 0 && (
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<Tag className="w-4 h-4 mr-2" />
							Tags
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							{tags.slice(0, 20).map((tag) => (
								<DropdownMenuItem key={tag.name} onClick={() => onRefChange(tag.name)}>
									{tag.name}
								</DropdownMenuItem>
							))}
							{tags.length > 20 && (
								<DropdownMenuItem disabled>... and {tags.length - 20} more</DropdownMenuItem>
							)}
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// Search Section Component
function SearchSection({
	searchQuery,
	setSearchQuery,
	onSearch,
	loading,
}: {
	searchQuery: string;
	setSearchQuery: (value: string) => void;
	onSearch: () => void;
	loading: boolean;
}) {
	return (
		<div className="flex items-center gap-2">
			<Search className="w-4 h-4 text-muted-foreground" />
			<Input
				placeholder="Search commits..."
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				onKeyDown={(e) => e.key === 'Enter' && onSearch()}
				className="h-8 w-48"
			/>
			<Button size="sm" onClick={onSearch} disabled={loading}>
				Search
			</Button>
		</div>
	);
}

// View Options Dropdown Component
function ViewOptionsDropdown({
	loading,
	commitCount,
	setCommitCount,
	includeMerges,
	setIncludeMerges,
	fromRef,
	setFromRef,
	toRef,
	setToRef,
	onApplyFilters,
}: {
	loading: boolean;
	commitCount: number;
	setCommitCount: (value: number) => void;
	includeMerges: boolean;
	setIncludeMerges: (value: boolean) => void;
	fromRef: string;
	setFromRef: (value: string) => void;
	toRef: string;
	setToRef: (value: string) => void;
	onApplyFilters: () => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" disabled={loading}>
					<Settings className="w-4 h-4 mr-2" />
					Options
					<ChevronDown className="w-4 h-4 ml-2" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>View Options</DropdownMenuLabel>
				<DropdownMenuSeparator />

				<div className="p-2 space-y-3">
					<div>
						<Label htmlFor="commitCount">Commit Count</Label>
						<Input
							id="commitCount"
							type="number"
							value={commitCount}
							onChange={(e) => setCommitCount(parseInt(e.target.value) || 100)}
							className="h-8"
							min="1"
							max="1000"
						/>
					</div>

					<div className="flex items-center space-x-2">
						<input
							type="checkbox"
							id="includeMerges"
							checked={includeMerges}
							onChange={(e) => setIncludeMerges(e.target.checked)}
							className="rounded"
						/>
						<Label htmlFor="includeMerges" className="text-sm">
							Include merge commits
						</Label>
					</div>

					<div>
						<Label htmlFor="fromRef">From Ref</Label>
						<Input
							id="fromRef"
							value={fromRef}
							onChange={(e) => setFromRef(e.target.value)}
							placeholder="Optional: branch/tag/hash"
							className="h-8"
						/>
					</div>

					<div>
						<Label htmlFor="toRef">To Ref</Label>
						<Input
							id="toRef"
							value={toRef}
							onChange={(e) => setToRef(e.target.value)}
							placeholder="Optional: branch/tag/hash"
							className="h-8"
						/>
					</div>

					<Button onClick={onApplyFilters} size="sm" className="w-full">
						<Filter className="w-4 h-4 mr-2" />
						Apply Filters
					</Button>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function GitLogToolbar({
	repoPath,
	onCommitsUpdate,
	loading,
	onLoadingChange,
	currentRef,
	onRefChange,
	onCompareRefs,
}: GitLogToolbarProps) {
	const [branches, setBranches] = useState<backend.GitRef[]>([]);
	const [tags, setTags] = useState<backend.GitRef[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [commitCount, setCommitCount] = useState(100);
	const [includeMerges, setIncludeMerges] = useState(true);
	const [fromRef, setFromRef] = useState('');
	const [toRef, setToRef] = useState('');
	const [fetchRemote, setFetchRemote] = useState('origin');
	const [fetchRef, setFetchRef] = useState('');

	// Load branches and tags when component mounts
	useEffect(() => {
		loadRefsData();
	}, [repoPath]);

	const loadRefsData = async () => {
		try {
			const [branchesData, tagsData] = await Promise.all([GetBranches(repoPath), GetTags(repoPath)]);
			setBranches(branchesData || []);
			setTags(tagsData || []);
		} catch (error) {
			console.error('Failed to load refs:', error);
		}
	};

	const handleRefresh = async () => {
		onLoadingChange(true);
		try {
			await loadRefsData();
			await loadCommitsWithCurrentOptions();
		} catch (error) {
			console.error('Failed to refresh:', error);
		} finally {
			onLoadingChange(false);
		}
	};

	const handleRefChange = async (newRef: string) => {
		onRefChange(newRef);
		onLoadingChange(true);
		try {
			const commits = await RunGitLogFromRef(repoPath, newRef);
			onCommitsUpdate(commits);
		} catch (error) {
			console.error('Failed to load commits from ref:', error);
		} finally {
			onLoadingChange(false);
		}
	};

	const loadCommitsWithCurrentOptions = async () => {
		onLoadingChange(true);
		try {
			const options: GitLogOptions = {
				commitsToLoad: commitCount,
				fromRef: fromRef || currentRef,
				toRef: toRef,
				includeMerges: includeMerges,
				searchQuery: searchQuery,
				author: '',
			};

			const commits = await RunGitLogWithOptions(repoPath, options);
			onCommitsUpdate(commits);
		} catch (error) {
			console.error('Failed to load commits with options:', error);
		} finally {
			onLoadingChange(false);
		}
	};

	const handleSearch = async () => {
		if (!searchQuery.trim()) {
			await loadCommitsWithCurrentOptions();
			return;
		}

		onLoadingChange(true);
		try {
			const commits = await SearchCommits(repoPath, searchQuery);
			onCommitsUpdate(commits);
		} catch (error) {
			console.error('Failed to search commits:', error);
		} finally {
			onLoadingChange(false);
		}
	};

	const handleFetch = async () => {
		if (!fetchRemote) return;

		onLoadingChange(true);
		try {
			await GitFetch(repoPath, fetchRemote, fetchRef);
			await loadRefsData(); // Refresh branches/tags after fetch
			// Show success message or notification here
		} catch (error) {
			console.error('Failed to fetch:', error);
			// Show error message or notification here
		} finally {
			onLoadingChange(false);
		}
	};

	const handleQuickCompare = () => {
		if (onCompareRefs) {
			onCompareRefs(currentRef, ''); // Compare current ref with working tree
		}
	};

	return (
		<div className="flex items-center gap-2 p-3 border-b bg-muted/30">
			{/* Refresh Button */}
			<Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
				<RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
				Refresh
			</Button>

			<RefSelectorDropdown
				loading={loading}
				currentRef={currentRef}
				branches={branches}
				tags={tags}
				onRefChange={handleRefChange}
			/>

			<Separator orientation="vertical" className="h-6" />

			<FetchDropdown
				loading={loading}
				onFetch={handleFetch}
				fetchRemote={fetchRemote}
				setFetchRemote={setFetchRemote}
				fetchRef={fetchRef}
				setFetchRef={setFetchRef}
			/>
			<Separator orientation="vertical" className="h-6" />

			<SearchSection
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				onSearch={handleSearch}
				loading={loading}
			/>

			<Separator orientation="vertical" className="h-6" />

			<ViewOptionsDropdown
				loading={loading}
				commitCount={commitCount}
				setCommitCount={setCommitCount}
				includeMerges={includeMerges}
				setIncludeMerges={setIncludeMerges}
				fromRef={fromRef}
				setFromRef={setFromRef}
				toRef={toRef}
				setToRef={setToRef}
				onApplyFilters={loadCommitsWithCurrentOptions}
			/>

			{onCompareRefs && (
				<>
					<Separator orientation="vertical" className="h-6" />
					<Button variant="outline" size="sm" onClick={handleQuickCompare} disabled={loading}>
						<GitCompare className="w-4 h-4 mr-2" />
						Compare
					</Button>
				</>
			)}
		</div>
	);
}
