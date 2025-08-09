import { DirDiffViewer } from '@/components/dir-diff-viewer';
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
import { useRepoState } from '@/hooks/state/repo/use-repo-state';
import {
	ArrowRight,
	ChevronDown,
	FileText,
	FolderTree,
	GitBranch,
	GitCompare,
	Loader2,
	X,
} from 'lucide-react';
import React, { useCallback, useMemo } from 'react';
import { git_operations } from 'wailsjs/go/models';

const useDiffOptions = (repoPath: string) => {
	const { diffState } = useRepoState(repoPath);

	// Initialize from existing atom state
	const currentOptions = diffState.options;
	const fromRef = currentOptions.fromRef;
	const toRef = currentOptions.toRef;
	const showAdvanced = currentOptions.showAdvanced;
	const filePathFilters = currentOptions.filePathFilters;

	const setFromRef = useCallback(
		(newFromRef: string) => {
			diffState.setOptions({ ...currentOptions, fromRef: newFromRef });
		},
		[diffState, currentOptions]
	);

	const setToRef = useCallback(
		(newToRef: string) => {
			diffState.setOptions({ ...currentOptions, toRef: newToRef });
		},
		[diffState, currentOptions]
	);

	const setShowAdvanced = useCallback(
		(newShowAdvanced: boolean) => {
			diffState.setOptions({ ...currentOptions, showAdvanced: newShowAdvanced });
		},
		[diffState, currentOptions]
	);

	const setFilePathFilters = useCallback(
		(newFilters: string) => {
			diffState.setOptions({ ...currentOptions, filePathFilters: newFilters });
		},
		[diffState, currentOptions]
	);

	const options = useMemo(
		(): git_operations.DiffOptions => ({
			repoPath: '',
			fromRef,
			toRef,
			filePathFilters: filePathFilters
				? filePathFilters
						.split(',')
						.map((p) => p.trim())
						.filter(Boolean)
				: [],
		}),
		[fromRef, toRef, filePathFilters]
	);

	const quickOptions = useMemo(
		() => [
			{ label: 'Current Changes vs HEAD', fromRef: 'HEAD', toRef: '' },
			{ label: 'Current Changes vs Staged', fromRef: '', toRef: 'HEAD' },
			{ label: 'HEAD vs Previous Commit', fromRef: 'HEAD~1', toRef: 'HEAD' },
			{ label: 'HEAD vs 2 Commits Back', fromRef: 'HEAD~2', toRef: 'HEAD' },
		],
		[]
	);

	const setQuickOption = useCallback(
		(option: (typeof quickOptions)[0]) => {
			diffState.setOptions({
				...currentOptions,
				fromRef: option.fromRef,
				toRef: option.toRef,
			});
		},
		[diffState, currentOptions]
	);

	const diffDescription = useMemo(() => {
		if (!toRef || toRef === '') {
			return `Comparing ${fromRef} with current changes`;
		}
		return `Comparing ${fromRef} with ${toRef}`;
	}, [fromRef, toRef]);

	return {
		fromRef,
		toRef,
		showAdvanced,
		filePathFilters,
		options,
		quickOptions,
		diffDescription,
		setFromRef,
		setToRef,
		setShowAdvanced,
		setFilePathFilters,
		setQuickOption,
	};
};

// Component modules
const ViewToolbar = ({
	repoPath,
	diffOptions,
}: {
	repoPath: string;
	diffOptions: ReturnType<typeof useDiffOptions>;
}) => {
	const { diffState } = useRepoState(repoPath);

	const handleCreateDiff = useCallback(async () => {
		const options = { ...diffOptions.options, repoPath };
		await diffState.createSession(options);
	}, [diffOptions.options, repoPath, diffState]);

	return (
		<div className="border-b bg-muted/20 p-3">
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-3">
					<GitCompare className="w-4 h-4" />
					<span className="font-medium">Repository Diff</span>
				</div>
				<div className="flex items-center gap-2">
					<QuickOptionsDropdown
						options={diffOptions.quickOptions}
						onSelect={diffOptions.setQuickOption}
					/>
					<Button
						onClick={handleCreateDiff}
						disabled={diffState.isLoading || !diffOptions.fromRef}
						size="sm"
					>
						{diffState.isLoading ? (
							<Loader2 className="w-3 h-3 animate-spin" />
						) : (
							<GitCompare className="w-3 h-3" />
						)}
						Compare
					</Button>
				</div>
			</div>
			<DiffOptionsForm repoPath={repoPath} diffOptions={diffOptions} />
		</div>
	);
};

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
		<DropdownMenuContent align="end">
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

const DiffOptionsForm = ({
	repoPath,
	diffOptions,
}: {
	repoPath: string;
	diffOptions: ReturnType<typeof useDiffOptions>;
}) => {
	const { logState } = useRepoState(repoPath);

	if (!diffOptions.showAdvanced) {
		return (
			<div className="flex items-center gap-4">
				<div className="flex-1">
					<RefSelector
						label="Compare From"
						value={diffOptions.fromRef}
						onChange={diffOptions.setFromRef}
						refs={logState.refs ?? []}
						icon={<GitBranch className="w-4 h-4" />}
						inline
					/>
				</div>
				<ArrowRight className="w-4 h-4 text-muted-foreground mb-1" />
				<div className="flex-1">
					<RefSelector
						label="Compare To"
						value={diffOptions.toRef}
						onChange={diffOptions.setToRef}
						refs={logState.refs ?? []}
						icon={<FolderTree className="w-4 h-4" />}
						allowEmpty
						emptyLabel="Current Changes"
						inline
					/>
				</div>
				<Button
					onClick={() => diffOptions.setShowAdvanced(!diffOptions.showAdvanced)}
					variant="ghost"
					size="sm"
					className="mb-1"
				>
					Advanced
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-3 text-sm">
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-3 flex-1">
					<Label htmlFor="fromRefInput" className="text-xs font-medium whitespace-nowrap">
						Compare From
					</Label>
					<Input
						id="fromRefInput"
						value={diffOptions.fromRef}
						onChange={(e) => diffOptions.setFromRef(e.target.value)}
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
						value={diffOptions.toRef}
						onChange={(e) => diffOptions.setToRef(e.target.value)}
						placeholder="Leave empty for current changes"
						className="text-xs h-8 flex-1"
					/>
				</div>
				<Button
					onClick={() => diffOptions.setShowAdvanced(!diffOptions.showAdvanced)}
					variant="ghost"
					size="sm"
				>
					Simple
				</Button>
			</div>
			<div className="space-y-1">
				<Label htmlFor="filePaths" className="text-xs">
					File Paths (optional)
				</Label>
				<Input
					id="filePaths"
					value={diffOptions.filePathFilters}
					onChange={(e) => diffOptions.setFilePathFilters(e.target.value)}
					placeholder="src/, README.md, *.js (comma-separated)"
					className="text-xs h-8"
				/>
			</div>
		</div>
	);
};

const RefSelector = ({
	label,
	value,
	onChange,
	refs,
	icon,
	allowEmpty = false,
	emptyLabel,
	inline = false,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	refs: git_operations.GitRef[];
	icon: React.ReactNode;
	allowEmpty?: boolean;
	emptyLabel?: string;
	inline?: boolean;
}) => (
	<div className={inline ? 'flex items-center gap-3' : 'space-y-2'}>
		<Label className={inline ? 'text-sm font-medium whitespace-nowrap' : ''}>{label}</Label>
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					className={inline ? 'justify-between flex-1' : 'w-full justify-between'}
				>
					<span className="flex items-center gap-2">
						{icon}
						{value || (allowEmpty ? emptyLabel : 'Select ref...')}
					</span>
					<ChevronDown className="w-4 h-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-64">
				<DropdownMenuLabel>Select Reference</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{allowEmpty && (
					<>
						<DropdownMenuItem onClick={() => onChange('')}>
							<span className="flex items-center gap-2">
								<FolderTree className="w-4 h-4" />
								{emptyLabel}
							</span>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</>
				)}
				{refs.slice(0, 20).map((ref) => (
					<DropdownMenuItem key={ref.name} onClick={() => onChange(ref.name)}>
						<span className="flex items-center gap-2">
							{ref.type === 'tag' ? (
								<FileText className="w-4 h-4" />
							) : (
								<GitBranch className="w-4 h-4" />
							)}
							{ref.name}
						</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	</div>
);

const SessionTabs = ({ repoPath }: { repoPath: string }) => {
	const { diffState } = useRepoState(repoPath);

	const handleSessionSelect = (sessionId: string) => {
		diffState.selectedSession.setById(sessionId);
	};

	const handleSessionClose = (sessionId: string) => {
		diffState.closeSession(sessionId);
	};

	const sessions = diffState.sessionData;
	const selectedSessionId = diffState.selectedSession.getId();

	return (
		<div className="border-b bg-gradient-to-r from-muted/5 to-muted/10 backdrop-blur-sm">
			<div className="flex items-center gap-2 p-2 overflow-x-auto scrollbar-hide">
				{sessions.map((session) => (
					<div
						key={session.sessionId}
						className={`
							flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0 min-w-[160px] 
							transition-all duration-200 ease-in-out cursor-pointer group
							${
								selectedSessionId === session.sessionId
									? 'bg-primary/10 border border-primary/20 shadow-sm text-primary'
									: 'bg-background/80 border border-border/50 hover:bg-muted/50 hover:border-border text-muted-foreground hover:text-foreground'
							}
						`}
						onClick={() => handleSessionSelect(session.sessionId)}
					>
						<span className="truncate text-sm font-medium">{session.title}</span>
						<button
							className="w-5 h-5 rounded-md flex items-center justify-center transition-colors duration-150 hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100 opacity-60"
							onClick={(e) => {
								e.stopPropagation();
								handleSessionClose(session.sessionId);
							}}
							title="Close diff session"
						>
							<X className="w-3 h-3" />
						</button>
					</div>
				))}
			</div>
		</div>
	);
};

export default function RepoDiffView({ repoPath }: { repoPath: string }) {
	const { diffState } = useRepoState(repoPath);

	if (!repoPath) {
		return <div>Error: No repository path provided</div>;
	}

	const diffOptions = useDiffOptions(repoPath);

	return (
		<div className="flex flex-col h-full">
			<ViewToolbar repoPath={repoPath} diffOptions={diffOptions} />

			<SessionTabs repoPath={repoPath} />

			<div className="flex-1 overflow-hidden min-h-0">
				{!!diffState.selectedSession.getData()?.directoryData && (
					<DirDiffViewer repoPath={repoPath} />
				)}
			</div>
		</div>
	);
}
