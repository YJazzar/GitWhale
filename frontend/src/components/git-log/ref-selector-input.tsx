import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GitBranch, GitCommitHorizontal, Tag, Check } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';

interface LabeledRefSelectorInputProps {
	repoPath: string;
	label: string;
	currentGitRef: string;
	onUpdateGitRef: (newRefName: string) => void;
}

export function LabeledRefSelectorInput({
	repoPath,
	label,
	currentGitRef,
	onUpdateGitRef,
}: LabeledRefSelectorInputProps) {
	return (
		<div className="space-y-2">
			<Label className="text-sm font-medium">{label}</Label>
			<RefSelectorInput
				repoPath={repoPath}
				currentGitRef={currentGitRef}
				onUpdateGitRef={onUpdateGitRef}
			/>
		</div>
	);
}

interface RefSelectorInputProps {
	repoPath: string;
	currentGitRef: string;
	onUpdateGitRef: (newRefName: string) => void;
}

export function RefSelectorInput({ repoPath, currentGitRef, onUpdateGitRef }: RefSelectorInputProps) {
	const { logState } = useRepoState(repoPath);
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState(currentGitRef);
	const inputRef = useRef<HTMLInputElement>(null);

	const allRepoRefs = logState.refs ?? [];

	// Add HEAD to the refs list
	const allRefs = useMemo(() => {
		const refs = [{ name: 'HEAD', type: 'head' }];
		return refs.concat(allRepoRefs);
	}, [allRepoRefs]);

	// Filter refs based on input value
	const filteredRefs = useMemo(() => {
		if (!inputValue.trim()) return allRefs;

		const query = inputValue.toLowerCase();
		return allRefs.filter((ref) => ref.name.toLowerCase().includes(query));
	}, [allRefs, inputValue]);

	const getRefIcon = (type: string) => {
		switch (type) {
			case 'head':
				return <GitCommitHorizontal className="w-4 h-4" />;
			case 'tag':
				return <Tag className="w-4 h-4" />;
			default:
				return <GitBranch className="w-4 h-4" />;
		}
	};

	const getRefTypeLabel = (type: string) => {
		switch (type) {
			case 'head':
				return 'HEAD';
			case 'localBranch':
				return 'Local Branch';
			case 'remoteBranch':
				return 'Remote Branch';
			case 'tag':
				return 'Tag';
			default:
				return 'Reference';
		}
	};

	const handleSelect = (refName: string) => {
		setInputValue(refName);
		onUpdateGitRef(refName);
		setOpen(false);
		// Return focus to input after selection
		setTimeout(() => {
			inputRef.current?.focus();
		}, 0);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setInputValue(value);
		if (!open && value.length > 0) {
			setOpen(true);
		}
	};

	const handleInputFocus = () => {
		if (filteredRefs.length > 0) {
			setOpen(true);
		}
	};

	const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		// Don't close immediately - give time for popover clicks
		setTimeout(() => {
			// Only update if the input value has changed and is different from current ref
			if (inputValue !== currentGitRef && inputValue.trim()) {
				onUpdateGitRef(inputValue.trim());
			} else if (!inputValue.trim()) {
				// Reset to current ref if input is empty
				setInputValue(currentGitRef);
			}
		}, 150);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Escape') {
			setOpen(false);
			setInputValue(currentGitRef);
		} else if (e.key === 'Enter' && inputValue.trim()) {
			onUpdateGitRef(inputValue.trim());
			setOpen(false);
		}
	};

	// Update input value when currentGitRef changes externally
	useEffect(() => {
		setInputValue(currentGitRef);
	}, [currentGitRef]);

	return (
		<div className="relative">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<div className="relative">
						<Input
							ref={inputRef}
							value={inputValue}
							onChange={handleInputChange}
							onFocus={handleInputFocus}
							onBlur={handleInputBlur}
							onKeyDown={handleKeyDown}
							placeholder="Enter ref name..."
							className="w-full min-w-[200px] max-w-[300px] pr-8"
							disabled={logState.isLoading}
						/>
						<div className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
							{getRefIcon(
								allRefs.find((ref) => ref.name === currentGitRef)?.type || 'localBranch'
							)}
						</div>
					</div>
				</PopoverTrigger>
				<PopoverContent className="w-[300px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
					<Command shouldFilter={false}>
						<CommandList>
							{filteredRefs.length === 0 ? (
								<CommandEmpty>No references found.</CommandEmpty>
							) : (
								<>
									{/* Group by type */}
									{['head', 'localBranch', 'remoteBranch', 'tag'].map((type) => {
										const refsOfType = filteredRefs.filter((ref) => ref.type === type);
										if (refsOfType.length === 0) return null;

										return (
											<CommandGroup key={type} heading={getRefTypeLabel(type)}>
												{refsOfType.map((ref) => (
													<CommandItem
														key={ref.name}
														value={ref.name}
														onSelect={() => handleSelect(ref.name)}
														className="flex items-center justify-between"
													>
														<div className="flex items-center gap-2">
															{getRefIcon(ref.type)}
															<span>{ref.name}</span>
														</div>
														{ref.name === currentGitRef && (
															<Check className="w-4 h-4" />
														)}
													</CommandItem>
												))}
											</CommandGroup>
										);
									})}
								</>
							)}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	);
}
