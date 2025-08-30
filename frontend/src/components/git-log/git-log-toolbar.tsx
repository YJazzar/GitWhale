import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useNavigateToCommitDiffs } from '@/hooks/navigation/use-navigate-commit-diffs';
import { useRepoLogState } from '@/hooks/state/repo/use-git-log-state';
import Logger from '@/utils/logger';
import {
	ChevronDown,
	Download,
	Filter,
	GitCompareArrows,
	Loader2,
	RefreshCw,
	Search,
	Settings,
} from 'lucide-react';
import { useState } from 'react';
import { CompareModal } from './compare-modal';
import { RefSelectorInput } from './ref-selector-input';

interface GitLogToolbarProps {
	repoPath: string;
}

export function GitLogToolbar({ repoPath }: GitLogToolbarProps) {
	const { refreshLogAndRefs, options, isLoading } = useRepoLogState(repoPath);

	const onRefresh = async () => {
		refreshLogAndRefs();
	};

	const toolbarOptions = options.get();
	const onUpdateSelectedRefForLog = (newFromRef: string) => {
		options.set({ ...toolbarOptions, fromRef: newFromRef });
		refreshLogAndRefs();
	};

	return (
		<div className="flex items-center gap-2 p-3 border-b bg-muted/30">
			{/* Refresh Button */}
			<Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
				<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
			</Button>

			<ViewOptionsDropdown repoPath={repoPath} />

			<RefSelectorInput
				repoPath={repoPath}
				currentGitRef={toolbarOptions.fromRef ?? ''}
				showEmptyAs={'HEAD'}
				onUpdateGitRef={onUpdateSelectedRefForLog}
				allowCurrentChangesAsRef={false}
			/>

			<Separator orientation="vertical" className="h-6" />

			<SearchSection repoPath={repoPath} />

			<Separator orientation="vertical" className="h-6" />

			<FetchButton repoPath={repoPath} />

			<div className="grow" />

			<CompareButton repoPath={repoPath} />
		</div>
	);
}

// Fetch Dropdown Component
function FetchButton({ repoPath }: { repoPath: string }) {
	const { refetchRepo, isLoading } = useRepoLogState(repoPath);

	const onFetch = () => {
		refetchRepo();
	};

	return (
		<Button variant="outline" size="sm" disabled={isLoading} onClick={onFetch}>
			<Download className="w-4 h-4" />
			Fetch
		</Button>
	);
}

function CompareButton({ repoPath }: { repoPath: string }) {
	const { selectedCommits, isLoading } = useRepoLogState(repoPath);
	const { navigateToCommitDiff, isLoadingNewDiff } = useNavigateToCommitDiffs(repoPath);
	const [showCompareModal, setShowCompareModal] = useState(false);

	const numSelectedCommits = selectedCommits.currentSelectedCommits.length ?? 0;

	const hasCommitSelected = numSelectedCommits > 0;
	const isButtonDisabled = isLoading || !hasCommitSelected || isLoadingNewDiff;

	const onCompare = () => {
		if (numSelectedCommits === 1) {
			navigateToCommitDiff(selectedCommits.currentSelectedCommits[0], undefined);
			return;
		}

		if (numSelectedCommits === 2) {
			navigateToCommitDiff(
				selectedCommits.currentSelectedCommits[0],
				selectedCommits.currentSelectedCommits[1]
			);
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
					{isLoadingNewDiff ? (
						<Loader2 className="w-4 h-4 mr-1 animate-spin" />
					) : (
						<GitCompareArrows className="w-4 h-4 mr-1" />
					)}
					{compareString}
				</Button>

				<Button
					variant="outline"
					size="sm"
					disabled={isLoading}
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
	const { options, isLoading, refreshLogAndRefs } = useRepoLogState(repoPath);
	const toolbarOptions = options.get();

	const searchQuery = toolbarOptions.searchQuery ?? '';
	const setSearchQuery = (newQuery: string) => {
		options.set({ ...toolbarOptions, searchQuery: newQuery });
	};

	const onSearch = async () => {
		refreshLogAndRefs();
	};

	const onClearSearch = () => {
		setSearchQuery('');
		refreshLogAndRefs();
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
	const { options, refreshLogAndRefs, isLoading } = useRepoLogState(repoPath);

	const toolbarOptions = options.get();

	const onSetCommitCountToLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newCommitsToLoad = event.target.value;
		if (!newCommitsToLoad || !Number(newCommitsToLoad)) {
			options.set({ ...toolbarOptions, commitsToLoad: undefined });
			return;
		}

		options.set({ ...toolbarOptions, commitsToLoad: Number(newCommitsToLoad) });
	};

	const onApplyFilters = () => {
		refreshLogAndRefs();
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" disabled={isLoading}>
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
