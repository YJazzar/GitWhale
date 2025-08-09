import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import {
	ChevronDown,
	Download,
	Filter,
	GitBranch,
	GitCommitHorizontal,
	RefreshCw,
	Search,
	Settings,
	Tag,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface GitLogToolbarProps {
	repoPath: string;
}

export function GitLogToolbar({ repoPath }: GitLogToolbarProps) {
	const { logState } = useRepoState(repoPath);
	const toolbarOptions = logState.options.get();

	const searchQuery = toolbarOptions.searchQuery ?? '';
	const setSearchQuery = (newQuery: string) => {
		logState.options.set({ ...toolbarOptions, searchQuery: newQuery });
	};

	const handleSearch = async () => {
		logState.refreshLogAndRefs();
	};

	const onRefresh = async () => {
		logState.refreshLogAndRefs();
	};

	return (
		<div className="flex items-center gap-2 p-3 border-b bg-muted/30">
			{/* Refresh Button */}
			<Button variant="outline" size="sm" onClick={onRefresh} disabled={logState.isLoading}>
				<RefreshCw className={`w-4 h-4 mr-2 ${logState.isLoading ? 'animate-spin' : ''}`} />
				Refresh
			</Button>

			<RefSelectorDropdown repoPath={repoPath} />

			<Separator orientation="vertical" className="h-6" />

			<FetchDropdown repoPath={repoPath} />

			<Separator orientation="vertical" className="h-6" />

			<SearchSection
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				onSearch={handleSearch}
				loading={logState.isLoading}
			/>

			<Separator orientation="vertical" className="h-6" />

			<ViewOptionsDropdown repoPath={repoPath} />
		</div>
	);
}

// Ref Selector Dropdown Component
function RefSelectorDropdown({ repoPath }: { repoPath: string }) {
	const { logState } = useRepoState(repoPath);
	const isLoadingLogs = logState.isLoading;

	const toolbarOptions = logState.options.get();
	const getCurrentRefDisplay = () => {
		if (!toolbarOptions.fromRef) {
			return 'HEAD';
		}
		return toolbarOptions.fromRef.length > 20
			? `${toolbarOptions.fromRef.substring(0, 20)}...`
			: toolbarOptions.fromRef;
	};

	const allRepoRefs = logState.refs ?? [];
	const localBranches = allRepoRefs.filter((b) => b.type === 'localBranch');
	const remoteBranches = allRepoRefs.filter((b) => b.type === 'remoteBranch');
	const tags = allRepoRefs.filter((b) => b.type === 'tag');

	const onUpdateSelectedRefForLog = (newFromRef: string) => {
		logState.options.set({ ...toolbarOptions, fromRef: newFromRef });
		logState.refreshLogAndRefs();
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" disabled={isLoadingLogs}>
					<GitBranch className="w-4 h-4 mr-2" />
					{getCurrentRefDisplay()}
					<ChevronDown className="w-4 h-4 ml-2" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-64">
				<DropdownMenuItem onClick={() => onUpdateSelectedRefForLog('HEAD')}>
					<GitCommitHorizontal />
					<span>HEAD</span>
				</DropdownMenuItem>

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
										onClick={() => onUpdateSelectedRefForLog(branch.name)}
									>
										<span>{branch.name}</span>
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
										onClick={() => onUpdateSelectedRefForLog(branch.name)}
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
								<DropdownMenuItem
									key={tag.name}
									onClick={() => onUpdateSelectedRefForLog(tag.name)}
								>
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

// Fetch Dropdown Component
function FetchDropdown({ repoPath }: { repoPath: string }) {
	const { logState } = useRepoState(repoPath);

	const onFetch = () => {
		logState.refetchRepo();
	};

	return (
		<Button variant="outline" size="sm" disabled={logState.isLoading} onClick={onFetch}>
			<Download className="w-4 h-4 mr-2" />
			Fetch
		</Button>
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
function ViewOptionsDropdown({ repoPath }: { repoPath: string }) {
	const { logState } = useRepoState(repoPath);

	const toolbarOptions = logState.options.get();

	const onSetCommitCountToLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newCommitsToLoad = event.target.value
		if (!newCommitsToLoad || !Number(newCommitsToLoad)) { 
			logState.options.set({ ...toolbarOptions, commitsToLoad: undefined });
			return
		}

		logState.options.set({ ...toolbarOptions, commitsToLoad: Number(newCommitsToLoad) });
	};

	const onApplyFilters = () => {
		logState.refreshLogAndRefs();
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" disabled={logState.isLoading}>
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
						<Label htmlFor="commitCount">Commit Count: {toolbarOptions.commitsToLoad}</Label>
						<Input
							id="commitCount"
							type="number"
							value={toolbarOptions.commitsToLoad}
							onChange={onSetCommitCountToLoad}
							className="h-8"
							min={0}
							maxLength={10000000}
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
