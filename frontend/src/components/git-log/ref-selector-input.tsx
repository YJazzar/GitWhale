import { Button } from '@/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { convertToShortHash } from '@/hooks/git-log/use-short-hash';
import { useValidateRef, UseValidateRefResult } from '@/hooks/git-log/use-validate-ref';
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import { cn } from '@/lib/utils';
import {
	Check,
	CheckCircle2,
	ChevronsUpDown,
	GitBranch,
	GitCommitHorizontal,
	Loader2,
	Tag,
	XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface LabeledRefSelectorInputProps extends RefSelectorInputProps {
	label: string;
}

export function LabeledRefSelectorInput(props: LabeledRefSelectorInputProps) {
	return (
		<div className="space-y-2">
			<Label className="text-sm font-medium">{props.label}</Label>
			<RefSelectorInput
				repoPath={props.repoPath}
				currentGitRef={props.currentGitRef}
				onUpdateGitRef={props.onUpdateGitRef}
				allowCurrentChangesAsRef={props.allowCurrentChangesAsRef}
				showEmptyAs={props.showEmptyAs}
				className={props.className}
			/>
		</div>
	);
}

interface RefSelectorInputProps {
	repoPath: string;
	currentGitRef: string;
	onUpdateGitRef: (newRefName: string) => void;
	allowCurrentChangesAsRef: boolean;
	showEmptyAs: string;
	className?: string;
}

export function RefSelectorInput(props: RefSelectorInputProps) {
	const {
		repoPath,
		currentGitRef,
		onUpdateGitRef,
		className,
		allowCurrentChangesAsRef,
		showEmptyAs,
	} = props;

	const { logState } = useRepoState(repoPath);
	const [open, setOpen] = useState(false);
	const [commandSearchInput, setCommandSearchInput] = useState<string>('');

	const currentGitRefValidation = useValidateRef(repoPath, currentGitRef);
	const commandInputValidation = useValidateRef(repoPath, commandSearchInput);

	const allRepoRefs = logState.refs ?? [];

	// Add HEAD to the refs list and create a flat structure
	const allRefs = useMemo(() => {
		const refs = [{ value: 'HEAD', label: 'HEAD', type: 'commit' }];

		if (allowCurrentChangesAsRef) {
			refs.push({ label: 'Current Changes', value: '', type: 'commit' });
		}

		return refs.concat(
			allRepoRefs.map((ref) => ({
				value: ref.name,
				label: ref.name,
				type: ref.type,
			}))
		);
	}, [allRepoRefs, allowCurrentChangesAsRef]);

	// Handle paste and input changes with validation
	const handleCommandSearchChange = (value: string) => {
		setCommandSearchInput(value);
	};

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

	const getCurrentRefIcon = () => {
		const currentRef = allRefs.find((ref) => ref.value === currentGitRef);
		// If it's not a known ref, assume it's a commit hash
		return getRefIcon(currentRef?.type || 'commit');
	};

	const getValidationIcon = (validationState: UseValidateRefResult) => {
		switch (validationState.validationState) {
			case 'validating':
				return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />;
			case 'valid':
				return <CheckCircle2 className="w-3 h-3 text-green-600" />;
			case 'invalid':
				return <XCircle className="w-3 h-3 text-red-600" />;
			case 'idle':
				return null;
			default:
				return null;
		}
	};


	let currentGitRefDisplayValue
	if (!!showEmptyAs && (!currentGitRef || currentGitRef === "")) { 
		currentGitRefDisplayValue = showEmptyAs
	} else { 
		currentGitRefDisplayValue = convertToShortHash(currentGitRef, true)
	}

	return (
		<TooltipProvider>
			<Popover open={open} onOpenChange={setOpen} modal={true}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className={cn(
							'w-full max-w-48 justify-between font-normal',
							currentGitRefValidation.isValid === false && 'border-red-500',
							className
						)}
						disabled={logState.isLoading}
					>
						<div className="flex items-center gap-2 min-w-0">
							{/* Show validation icon */}
							{!currentGitRefValidation.didSkipValidation && (
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="flex items-center gap-1">
											{getValidationIcon(currentGitRefValidation)}
										</div>
									</TooltipTrigger>
									<TooltipContent>
										<p>
											{currentGitRefValidation.isValid === null
												? 'Custom Git reference'
												: currentGitRefValidation.isValid
												? 'Valid Git reference'
												: 'Invalid Git reference'}

											{JSON.stringify(currentGitRefValidation, null, 4)}
										</p>
									</TooltipContent>
								</Tooltip>
							)}

							{/* Otherwise show a normal ref/commit icon */}
							{currentGitRefValidation.didSkipValidation && getCurrentRefIcon()}

							{/* The name of the ref */}
							<div className="flex items-center gap-1 min-w-0">
								<span
									className={cn(
										'truncate',
										!currentGitRefValidation.didSkipValidation && 'italic pr-1'
									)}
								>
									{currentGitRefDisplayValue}
								</span>
							</div>
						</div>
						<ChevronsUpDown className="w-4 h-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[300px] p-0" align="start">
					<Command>
						<CommandInput
							placeholder="Search references or enter custom..."
							className="h-9"
							value={commandSearchInput}
							onValueChange={handleCommandSearchChange}
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
														currentGitRef === ref.value
															? 'opacity-100'
															: 'opacity-0'
													)}
												/>
											</CommandItem>
										))}
									</CommandGroup>
								);
							})}
							{commandSearchInput && !commandInputValidation.didSkipValidation && (
								<CommandGroup heading="Custom Reference">
									<CommandItem
										value={commandSearchInput}
										onSelect={() => {
											if (commandInputValidation.isValid) {
												onUpdateGitRef(commandSearchInput);
												setOpen(false);
												return;
											}
										}}
										className={cn(
											'flex items-center justify-between',
											!commandInputValidation.isValid && 'text-red-600'
										)}
									>
										<div className="flex flex-col">
											<div className="flex items-center gap-2">
												{getValidationIcon(commandInputValidation)}

												<span className="italic">
													{convertToShortHash(commandSearchInput, true)}
												</span>

												<Check
													className={cn(
														'w-4 h-4',
														currentGitRef === commandSearchInput
															? 'opacity-100'
															: 'opacity-0'
													)}
												/>
											</div>

											{!commandInputValidation.isValid && (
												<div className="text-xs text-red-600">
													Invalid reference - please check the name
												</div>
											)}
										</div>
									</CommandItem>
								</CommandGroup>
							)}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</TooltipProvider>
	);
}
