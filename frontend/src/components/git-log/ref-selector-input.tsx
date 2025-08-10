import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GitBranch, GitCommitHorizontal, Tag, Check, ChevronsUpDown } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LabeledRefSelectorInputProps {
	repoPath: string;
	label: string;
	currentGitRef: string;
	onUpdateGitRef: (newRefName: string) => void;
	className?: string;
}

export function LabeledRefSelectorInput({
	repoPath,
	label,
	currentGitRef,
	onUpdateGitRef,
	className,
}: LabeledRefSelectorInputProps) {
	return (
		<div className="space-y-2">
			<Label className="text-sm font-medium">{label}</Label>
			<RefSelectorInput
				repoPath={repoPath}
				currentGitRef={currentGitRef}
				onUpdateGitRef={onUpdateGitRef}
				className={className}
			/>
		</div>
	);
}

interface RefSelectorInputProps {
	repoPath: string;
	currentGitRef: string;
	onUpdateGitRef: (newRefName: string) => void;
	className?: string;
}

export function RefSelectorInput({
	repoPath,
	currentGitRef,
	onUpdateGitRef,
	className,
}: RefSelectorInputProps) {
	const { logState } = useRepoState(repoPath);
	const [open, setOpen] = useState(false);
	const [commandSearchInput, setCommandSearchInput] = useState<string>();

	const allRepoRefs = logState.refs ?? [];

	// Add HEAD to the refs list and create a flat structure
	const allRefs = useMemo(() => {
		const refs = [
			{ value: 'HEAD', label: 'HEAD', type: 'commit' },
		];
		return refs.concat(
			allRepoRefs.map((ref) => ({
				value: ref.name,
				label: ref.name,
				type: ref.type,
			}))
		);
	}, [allRepoRefs]);

	const getRefIcon = (type: string) => {
		switch (type) {
			case 'tag':
				return <Tag className="w-4 h-4 mr-2" />;
			case 'commit':
				return <GitCommitHorizontal className="w-4 h-4 mr-2" />;
			default:
				return <GitBranch className="w-4 h-4 mr-2" />;
		}
	};

	const getRefTypeLabel = (type: string) => {
		switch (type) {
			case 'commit':
				return '';
			case 'localBranch':
				return 'Local Branches';
			case 'remoteBranch':
				return 'Remote Branches';
			case 'tag':
				return 'Tags';
			default:
				return 'References';
		}
	};

	const getCurrentRefDisplay = () => {
		const currentRef = allRefs.find((ref) => ref.value === currentGitRef);
		return currentRef ? currentRef.label : currentGitRef;
	};

	const getCurrentRefIcon = () => {
		const currentRef = allRefs.find((ref) => ref.value === currentGitRef);
		// If it's not a known ref, assume it's a commit hash
		return getRefIcon(currentRef?.type || 'commit');
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn('w-full max-w-48 justify-between font-normal', className)}
					disabled={logState.isLoading}
				>
					<div className="flex items-center gap-2 min-w-0">
						{getCurrentRefIcon()}
						<span className="truncate">{getCurrentRefDisplay()}</span>
					</div>
					<ChevronsUpDown className="w-4 h-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[300px] p-0" align="start">
				<Command>
					<CommandInput
						placeholder="Search references..."
						className="h-9"
						value={commandSearchInput}
						onValueChange={setCommandSearchInput}
					/>
					<CommandList>
						<CommandEmpty>No references found.</CommandEmpty>
						{/* Group by type */}
						{['commit', 'localBranch', 'remoteBranch', 'tag'].map((type) => {
							const refsOfType = allRefs.filter((ref) => ref.type === type);
							if (refsOfType.length === 0) return null;

							return (
								<CommandGroup key={type} heading={getRefTypeLabel(type)}>
									{refsOfType.map((ref) => (
										<CommandItem
											key={ref.value}
											value={ref.value}
											onSelect={(currentValue) => {
												onUpdateGitRef(currentValue);
												setOpen(false);
											}}
											className="flex items-center justify-between"
										>
											<div className="flex items-center gap-2">
												{getRefIcon(ref.type)}
												<span>{ref.label}</span>
											</div>
											<Check
												className={cn(
													'w-4 h-4',
													currentGitRef === ref.value ? 'opacity-100' : 'opacity-0'
												)}
											/>
										</CommandItem>
									))}
								</CommandGroup>
							);
						})}
						<CommandGroup heading={getRefTypeLabel('')}>
							<CommandItem
								value={commandSearchInput}
								onSelect={(currentValue) => {
									onUpdateGitRef(currentValue);
									setOpen(false);
								}}
								className="flex items-center justify-between"
							>
								<div className="flex items-center gap-2">
									{getRefIcon('commit')}
									<span>{commandSearchInput}</span>
								</div>
								<Check
									className={cn(
										'w-4 h-4',
										currentGitRef === commandSearchInput ? 'opacity-100' : 'opacity-0'
									)}
								/>
							</CommandItem>
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
