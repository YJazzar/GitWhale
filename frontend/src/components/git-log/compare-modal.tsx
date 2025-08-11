import { Button } from '@/components/ui/button';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigateToCommitDiffs } from '@/hooks/git-diff/use-navigate-commit-diffs';
import { ArrowRight, ChevronDown, GitCompare, Loader2 } from 'lucide-react';
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
import { LabeledRefSelectorInput } from './ref-selector-input';

interface CompareModalProps {
	repoPath: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CompareModal({ repoPath, open, onOpenChange }: CompareModalProps) {
	const [fromRef, setFromRef] = useState('HEAD');
	const [toRef, setToRef] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const { navigateToCommitDiffWithOptions } = useNavigateToCommitDiffs(repoPath);

	const quickOptions = useMemo(
		() => [
			{ label: 'Current Changes', fromRef: 'HEAD', toRef: '' },
			{ label: 'Previous Commit vs HEAD', fromRef: 'HEAD~1', toRef: 'HEAD' },
			{ label: '2 Commits Back vs HEAD', fromRef: 'HEAD~2', toRef: 'HEAD' },
		],
		[]
	);

	const allowCurrentChangeSelectionInToRef = fromRef === "HEAD"

	const setQuickOption = useCallback((option: (typeof quickOptions)[0]) => {
		setFromRef(option.fromRef);
		setToRef(option.toRef);
	}, []);

	const handleCompare = async () => {
		if (!fromRef) return;

		setIsLoading(true);
		try {
			const diffOptions: git_operations.DiffOptions = {
				repoPath: repoPath,
				fromRef: fromRef,
				toRef: toRef,
				isSingleCommitDiff: false
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
			<DialogContent
				className="sm:max-w-[700px] max-h-[80vh] overflow-hidden"
				onEscapeKeyDown={(e) => {
					e.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<GitCompare className="w-5 h-5" />
						Compare References
					</DialogTitle>
					<DialogDescription>
						Launch a diff comparison between different Git references
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 overflow-y-auto max-h-[60vh] px-1">
					<div className="space-y-3">
						<div className="flex items-end gap-4">
							<div className="flex-1 min-w-0">
								<LabeledRefSelectorInput
									repoPath={repoPath}
									label="Compare From"
									currentGitRef={fromRef}
									onUpdateGitRef={setFromRef}
									allowCurrentChangesAsRef={false}
									className="min-w-48 max-w-full"
								/>
							</div>

							<ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mb-2" />

							<div className="flex-1 min-w-0">
								<LabeledRefSelectorInput
									repoPath={repoPath}
									label="Compare To"
									currentGitRef={toRef}
									onUpdateGitRef={setToRef}
									allowCurrentChangesAsRef={allowCurrentChangeSelectionInToRef}
									className="min-w-48 max-w-full"
								/>
							</div>
						</div>
						<div className="flex justify-end">
							<QuickOptionsDropdown options={quickOptions} onSelect={setQuickOption} />
						</div>
					</div>
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
				<DropdownMenuItem 
					key={index} 
					onClick={() => onSelect(option)}
					className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
				>
					{option.label}
				</DropdownMenuItem>
			))}
		</DropdownMenuContent>
	</DropdownMenu>
);
