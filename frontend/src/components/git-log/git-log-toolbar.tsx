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
import { useNavigateToCommitDiffs } from '@/hooks/git-diff/use-navigate-commit-diffs';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import Logger from '@/utils/logger';
import {
	Check,
	ChevronDown,
	Download,
	Filter,
	GitBranch,
	GitCommitHorizontal,
	GitCompareArrows,
	RefreshCw,
	Search,
	Settings,
	Tag,
	MoreHorizontal,
} from 'lucide-react';
import { CompareModal } from './compare-modal';
import { useState } from 'react';
import { RefSelectorInput } from './ref-selector-input';

interface GitLogToolbarProps {
	repoPath: string;
}

export function GitLogToolbar({ repoPath }: GitLogToolbarProps) {
	const { logState } = useRepoState(repoPath);

	const onRefresh = async () => {
		logState.refreshLogAndRefs();
	};

	const toolbarOptions = logState.options.get();
	const onUpdateSelectedRefForLog = (newFromRef: string) => {
		logState.options.set({ ...toolbarOptions, fromRef: newFromRef });
		logState.refreshLogAndRefs();
	};

	const getCurrentRefDisplay = () => {
		if (!toolbarOptions.fromRef) {
			return 'HEAD';
		}
		return toolbarOptions.fromRef.length > 20
			? `${toolbarOptions.fromRef.substring(0, 20)}...`
			: toolbarOptions.fromRef;
	};

	return (
		<div className="flex items-center gap-2 p-3 border-b bg-muted/30">
			{/* Refresh Button */}
			<Button variant="outline" size="sm" onClick={onRefresh} disabled={logState.isLoading}>
				<RefreshCw className={`w-4 h-4 ${logState.isLoading ? 'animate-spin' : ''}`} />
			</Button>

			<ViewOptionsDropdown repoPath={repoPath} />

			<RefSelectorInput
				repoPath={repoPath}
				currentGitRef={getCurrentRefDisplay()}
				// currentGitRef={toolbarOptions.fromRef ?? 'HEAD'}
				onUpdateGitRef={onUpdateSelectedRefForLog}
				allowCurrentChangesAsRef={false}
			/>

			<Separator orientation="vertical" className="h-6" />

			<SearchSection repoPath={repoPath} />

			<Separator orientation="vertical" className="h-6" />

			<FetchButton repoPath={repoPath} />

			<div className="flex-grow" />

			<CompareButton repoPath={repoPath} />
		</div>
	);
}

// Fetch Dropdown Component
function FetchButton({ repoPath }: { repoPath: string }) {
	const { logState } = useRepoState(repoPath);

	const onFetch = () => {
		logState.refetchRepo();
	};

	return (
		<Button variant="outline" size="sm" disabled={logState.isLoading} onClick={onFetch}>
			<Download className="w-4 h-4" />
			Fetch
		</Button>
	);
}

function CompareButton({ repoPath }: { repoPath: string }) {
	const { logState } = useRepoState(repoPath);
	const { navigateToCommitDiff } = useNavigateToCommitDiffs(repoPath);
	const [showCompareModal, setShowCompareModal] = useState(false);

	const selectedCommits = logState.selectedCommits.currentSelectedCommits;
	const numSelectedCommits = selectedCommits.length ?? 0;

	const hasCommitSelected = numSelectedCommits > 0;
	const isButtonDisabled = logState.isLoading || !hasCommitSelected;

	const onCompare = () => {
		if (numSelectedCommits === 1) {
			navigateToCommitDiff(selectedCommits[0], undefined);
			return;
		}

		if (numSelectedCommits === 2) {
			navigateToCommitDiff(selectedCommits[0], selectedCommits[1]);
			return;
		}

		Logger.error('User somehow attempted to diff more than two commits');
	};

	const compareString = numSelectedCommits <= 1 ? 'Diff' : 'Diff range';

	return (
		<>
			<div className="flex items-center">
				<Button
					variant="outline"
					size="sm"
					disabled={isButtonDisabled}
					onClick={onCompare}
					className="rounded-r-none border-r-0 pr-2"
				>
					<GitCompareArrows className="w-4 h-4 mr-1" />
					{compareString}
				</Button>

				<Button
					variant="outline"
					size="sm"
					disabled={logState.isLoading}
					onClick={() => setShowCompareModal(true)}
					className="rounded-l-none border-l-0 pl-1 pr-1 min-w-0 "
				>
					<ChevronDown className="h-4 w-4" />
				</Button>
			</div>

			<CompareModal repoPath={repoPath} open={showCompareModal} onOpenChange={setShowCompareModal} />
		</>
	);
}

// Search Section Component
function SearchSection({ repoPath }: { repoPath: string }) {
	const { logState } = useRepoState(repoPath);
	const toolbarOptions = logState.options.get();
	const isLoading = logState.isLoading;

	const searchQuery = toolbarOptions.searchQuery ?? '';
	const setSearchQuery = (newQuery: string) => {
		logState.options.set({ ...toolbarOptions, searchQuery: newQuery });
	};

	const onSearch = async () => {
		logState.refreshLogAndRefs();
	};

	const onClearSearch = () => {
		setSearchQuery('');
		logState.refreshLogAndRefs();
	};

	return (
		<div className="relative flex items-center">
			{/* Search icon on the left inside input */}
			<div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
				<Search className="w-4 h-4 text-muted-foreground" />
			</div>

			<Input
				placeholder="Search commits..."
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				onKeyDown={(e) => e.key === 'Enter' && onSearch()}
				className="h-8 w-64 pl-10 pr-20 focus-visible:ring-1 focus-visible:ring-primary"
			/>

			{/* Right side buttons container */}
			<div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
				{/* Clear button - only show when there's text */}
				{searchQuery && (
					<Button
						variant="ghost"
						size="sm"
						onClick={onClearSearch}
						className="h-6 w-6 p-0 hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground"
						aria-label="Clear search"
					>
						<span className="text-sm">×</span>
					</Button>
				)}

				{/* Search button */}
				<Button
					size="sm"
					onClick={onSearch}
					disabled={isLoading || !searchQuery.trim()}
					className="h-6 px-2 text-xs font-medium"
				>
					{isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Search'}
				</Button>
			</div>
		</div>
	);
}

// View Options Dropdown Component
function ViewOptionsDropdown({ repoPath }: { repoPath: string }) {
	const { logState } = useRepoState(repoPath);

	const toolbarOptions = logState.options.get();

	const onSetCommitCountToLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newCommitsToLoad = event.target.value;
		if (!newCommitsToLoad || !Number(newCommitsToLoad)) {
			logState.options.set({ ...toolbarOptions, commitsToLoad: undefined });
			return;
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
					<Settings className="w-4 h-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>View Options</DropdownMenuLabel>
				<DropdownMenuSeparator />

				<div className="p-2 space-y-3">
					<div>
						<Label htmlFor="commitCount">Commit Count:</Label>
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
