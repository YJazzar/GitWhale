import { Button } from '@/components/ui/button';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigateToCommitDiffs } from '@/hooks/git-diff/use-navigate-commit-diffs';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { ArrowRight, ChevronDown, FileText, FolderTree, GitBranch, GitCompare, Loader2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { git_operations } from 'wailsjs/go/models';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '../ui/dialog';
import { LabeledRefSelectorInput, RefSelectorInput } from './ref-selector-input';

interface CompareModalProps {
	repoPath: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CompareModal({ repoPath, open, onOpenChange }: CompareModalProps) {
	const { logState } = useRepoState(repoPath);

	// Form state
	const [fromRef, setFromRef] = useState('HEAD');
	const [toRef, setToRef] = useState('');
	const [filePathFilters, setFilePathFilters] = useState('');
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const { navigateToCommitDiffWithOptions } = useNavigateToCommitDiffs(repoPath);

	const quickOptions = useMemo(
		() => [
			{ label: 'Current Changes vs HEAD', fromRef: 'HEAD', toRef: '' },
			{ label: 'Current Changes vs Staged', fromRef: '', toRef: 'HEAD' },
			{ label: 'HEAD vs Previous Commit', fromRef: 'HEAD~1', toRef: 'HEAD' },
			{ label: 'HEAD vs 2 Commits Back', fromRef: 'HEAD~2', toRef: 'HEAD' },
		],
		[]
	);

	const setQuickOption = useCallback((option: (typeof quickOptions)[0]) => {
		setFromRef(option.fromRef);
		setToRef(option.toRef);
	}, []);

	const handleCompare = async () => {
		if (!fromRef) return;

		setIsLoading(true);
		try {
			// Create the diff session using the same logic as RepoDiffView
			const filePathFiltersArray = filePathFilters
				? filePathFilters
						.split(',')
						.map((p) => p.trim())
						.filter(Boolean)
				: [];

			const diffOptions: git_operations.DiffOptions = {
				repoPath: repoPath,
				fromRef: fromRef,
				toRef: toRef,
				filePathFilters: filePathFiltersArray,
			};
			navigateToCommitDiffWithOptions(diffOptions);

			onOpenChange(false);
		} catch (error) {
			console.error('Failed to create diff:', error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<GitCompare className="w-5 h-5" />
						Compare References
					</DialogTitle>
					<DialogDescription>
						Configure and launch a diff comparison between different Git references.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 overflow-y-auto max-h-[60vh] px-1">
					{/* Quick Options */}
					<div className="flex items-center justify-between">
						<Label className="text-sm font-medium">Quick Options</Label>
						<QuickOptionsDropdown options={quickOptions} onSelect={setQuickOption} />
					</div>

					{/* Simple vs Advanced Form */}
					{!showAdvanced ? (
						<SimpleForm
							repoPath={repoPath}
							fromRef={fromRef}
							toRef={toRef}
							setFromRef={setFromRef}
							setToRef={setToRef}
							refs={logState.refs ?? []}
							onToggleAdvanced={() => setShowAdvanced(true)}
						/>
					) : (
						<AdvancedForm
							fromRef={fromRef}
							toRef={toRef}
							filePathFilters={filePathFilters}
							setFromRef={setFromRef}
							setToRef={setToRef}
							setFilePathFilters={setFilePathFilters}
							onToggleSimple={() => setShowAdvanced(false)}
						/>
					)}
				</div>

				<DialogFooter className="pt-4 border-t">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleCompare} disabled={!fromRef || isLoading}>
						{isLoading ? (
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						) : (
							<GitCompare className="w-4 h-4 mr-2" />
						)}
						Compare
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

const QuickOptionsDropdown = ({
	options,
	onSelect,
}: {
	options: Array<{ label: string; fromRef: string; toRef: string }>;
	onSelect: (option: { label: string; fromRef: string; toRef: string }) => void;
}) => (
	<DropdownMenu>
		<DropdownMenuTrigger asChild>
			<Button variant="outline" size="sm">
				Quick Options
				<ChevronDown className="w-3 h-3 ml-1" />
			</Button>
		</DropdownMenuTrigger>
		<DropdownMenuContent align="end" className="w-56">
			<DropdownMenuLabel>Quick Diff Options</DropdownMenuLabel>
			<DropdownMenuSeparator />
			{options.map((option, index) => (
				<DropdownMenuItem key={index} onClick={() => onSelect(option)}>
					{option.label}
				</DropdownMenuItem>
			))}
		</DropdownMenuContent>
	</DropdownMenu>
);

const SimpleForm = ({
	repoPath,
	fromRef,
	toRef,
	setFromRef,
	setToRef,
	refs,
	onToggleAdvanced,
}: {
	repoPath: string;
	fromRef: string;
	toRef: string;
	setFromRef: (value: string) => void;
	setToRef: (value: string) => void;
	refs: git_operations.GitRef[];
	onToggleAdvanced: () => void;
}) => (
	<div className="space-y-3">
		<div className="flex items-center gap-4">
			<div className="flex-1 min-w-0">
				<LabeledRefSelectorInput
					repoPath={repoPath}
					label="Compare From"
					currentGitRef={fromRef}
					onUpdateGitRef={setFromRef}
				/>
			</div>
			<ArrowRight className="w-4 h-4 text-muted-foreground  flex-shrink-0" />
			<div className="flex-1 min-w-0">
				<LabeledRefSelectorInput
					repoPath={repoPath}
					label="Compare To"
					currentGitRef={toRef}
					onUpdateGitRef={setToRef}
				/>
			</div>
		</div>
		<div className="flex justify-end">
			<Button onClick={onToggleAdvanced} variant="ghost" size="sm">
				Advanced
			</Button>
		</div>
	</div>
);

const AdvancedForm = ({
	fromRef,
	toRef,
	filePathFilters,
	setFromRef,
	setToRef,
	setFilePathFilters,
	onToggleSimple,
}: {
	fromRef: string;
	toRef: string;
	filePathFilters: string;
	setFromRef: (value: string) => void;
	setToRef: (value: string) => void;
	setFilePathFilters: (value: string) => void;
	onToggleSimple: () => void;
}) => (
	<div className="space-y-3 text-sm">
		<div className="flex items-center gap-4">
			<div className="flex items-center gap-3 flex-1">
				<Label htmlFor="fromRefInput" className="text-xs font-medium whitespace-nowrap">
					Compare From
				</Label>
				<Input
					id="fromRefInput"
					value={fromRef}
					onChange={(e) => setFromRef(e.target.value)}
					placeholder="HEAD, branch, tag, commit hash..."
					className="text-xs h-8 flex-1"
				/>
			</div>
			<ArrowRight className="w-4 h-4 text-muted-foreground" />
			<div className="flex items-center gap-3 flex-1">
				<Label htmlFor="toRefInput" className="text-xs font-medium whitespace-nowrap">
					Compare To
				</Label>
				<Input
					id="toRefInput"
					value={toRef}
					onChange={(e) => setToRef(e.target.value)}
					placeholder="Leave empty for current changes"
					className="text-xs h-8 flex-1"
				/>
			</div>
			<Button onClick={onToggleSimple} variant="ghost" size="sm">
				Simple
			</Button>
		</div>
		<div className="space-y-1">
			<Label htmlFor="filePaths" className="text-xs">
				File Paths (optional)
			</Label>
			<Input
				id="filePaths"
				value={filePathFilters}
				onChange={(e) => setFilePathFilters(e.target.value)}
				placeholder="src/, README.md, *.js (comma-separated)"
				className="text-xs h-8"
			/>
		</div>
	</div>
);
