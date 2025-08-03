import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DirDiffViewer } from '@/components/dir-diff-viewer';
import { Routes, Route, Navigate } from 'react-router';
import {
	GitBranch,
	GitCompare,
	ChevronDown,
	Loader2,
	X,
	RefreshCw,
	FolderTree,
	FileText,
	ArrowRight,
} from 'lucide-react';
import { backend } from 'wailsjs/go/models';
import { StartDiffSession, EndDiffSession, GetBranches, GetTags } from '../../../wailsjs/go/backend/App';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';
import { useLocation } from 'react-router';

interface DiffRouterState {
	fromRef?: string;
	toRef?: string;
	autoStart?: boolean;
}

// Custom hooks for state management
const useDiffSessions = () => {
	const [loading, setLoading] = useState(false);
	const [sessions, setSessions] = useState<backend.DiffSession[]>([]);
	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

	const createSession = useCallback(async (options: backend.DiffOptions) => {
		setLoading(true);
		try {
			const session = await StartDiffSession(options);
			setSessions((prev) => [...prev, session]);
			setSelectedSessionId(session.sessionId);
			return session;
		} catch (error) {
			console.error('Failed to create diff session:', error);
			throw error;
		} finally {
			setLoading(false);
		}
	}, []);

	const closeSession = useCallback(
		async (sessionId: string) => {
			try {
				await EndDiffSession(sessionId);
				setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));

				if (selectedSessionId === sessionId) {
					const remainingSessions = sessions.filter((s) => s.sessionId !== sessionId);
					setSelectedSessionId(
						remainingSessions.length > 0 ? remainingSessions[0].sessionId : null
					);
				}
			} catch (error) {
				console.error('Failed to close diff session:', error);
				throw error;
			}
		},
		[selectedSessionId, sessions]
	);

	const selectedSession = useMemo(
		() => sessions.find((s) => s.sessionId === selectedSessionId) || null,
		[sessions, selectedSessionId]
	);

	return {
		loading,
		sessions,
		selectedSessionId,
		selectedSession,
		setSelectedSessionId,
		createSession,
		closeSession,
	};
};

const useGitRefs = (repoPath: string) => {
	const [branches, setBranches] = useState<backend.GitRef[]>([]);
	const [tags, setTags] = useState<backend.GitRef[]>([]);
	const [loading, setLoading] = useState(false);

	const loadRefs = useCallback(async () => {
		setLoading(true);
		try {
			const [branchesData, tagsData] = await Promise.all([GetBranches(repoPath), GetTags(repoPath)]);
			setBranches(branchesData || []);
			setTags(tagsData || []);
		} catch (error) {
			console.error('Failed to load refs:', error);
		} finally {
			setLoading(false);
		}
	}, [repoPath]);

	useEffect(() => {
		loadRefs();
	}, [loadRefs]);

	const allRefs = useMemo(() => [...branches, ...tags], [branches, tags]);

	return { branches, tags, allRefs, loading, loadRefs };
};

const useDiffOptions = (routerState?: DiffRouterState) => {
	const [fromRef, setFromRef] = useState(routerState?.fromRef || 'HEAD');
	const [toRef, setToRef] = useState(routerState?.toRef || '');
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [filePathFilters, setFilePathFilters] = useState('');

	const options = useMemo(
		(): backend.DiffOptions => ({
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

	const setQuickOption = useCallback((option: (typeof quickOptions)[0]) => {
		setFromRef(option.fromRef);
		setToRef(option.toRef);
	}, []);

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
	diffOptions,
	gitRefs,
	onCreateDiff,
	loading,
}: {
	diffOptions: ReturnType<typeof useDiffOptions>;
	gitRefs: ReturnType<typeof useGitRefs>;
	onCreateDiff: () => void;
	loading: boolean;
}) => (
	<div className="border-b bg-muted/20 p-3">
		<div className="flex items-center justify-between mb-3">
			<div className="flex items-center gap-3">
				<GitCompare className="w-4 h-4" />
				<span className="font-medium">Repository Diff</span>
			</div>
			<div className="flex items-center gap-2">
				<Button
					onClick={gitRefs.loadRefs}
					variant="outline"
					size="sm"
					disabled={loading}
					title="Refresh branches and tags"
				>
					<RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
				</Button>
				<QuickOptionsDropdown
					options={diffOptions.quickOptions}
					onSelect={diffOptions.setQuickOption}
				/>
				<Button onClick={onCreateDiff} disabled={loading || !diffOptions.fromRef} size="sm">
					{loading ? (
						<Loader2 className="w-3 h-3 animate-spin" />
					) : (
						<GitCompare className="w-3 h-3" />
					)}
					Compare
				</Button>
			</div>
		</div>
		<DiffOptionsForm diffOptions={diffOptions} gitRefs={gitRefs} />
	</div>
);

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
	diffOptions,
	gitRefs,
}: {
	diffOptions: ReturnType<typeof useDiffOptions>;
	gitRefs: ReturnType<typeof useGitRefs>;
}) => {
	if (!diffOptions.showAdvanced) {
		return (
			<div className="flex items-center gap-4">
				<div className="flex-1">
					<RefSelector
						label="Compare From"
						value={diffOptions.fromRef}
						onChange={diffOptions.setFromRef}
						refs={gitRefs.allRefs}
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
						refs={gitRefs.allRefs}
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
	refs: backend.GitRef[];
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

const SessionTabs = ({
	sessions,
	selectedSessionId,
	onSelect,
	onClose,
}: {
	sessions: backend.DiffSession[];
	selectedSessionId: string | null;
	onSelect: (sessionId: string) => void;
	onClose: (sessionId: string) => void;
}) => {
	if (sessions.length === 0) return null;

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
						onClick={() => onSelect(session.sessionId)}
					>
						<span className="truncate text-sm font-medium">{session.title}</span>
						<button
							className="w-5 h-5 rounded-md flex items-center justify-center transition-colors duration-150 hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100 opacity-60"
							onClick={(e) => {
								e.stopPropagation();
								onClose(session.sessionId);
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

const EmptyState = () => (
	<div className="w-full h-full flex items-center justify-center">
		<Card className="w-96">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<GitCompare className="w-5 h-5" />
					Repository Diff
				</CardTitle>
				<CardDescription>Compare different versions of your repository</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">
					Select your source and target references above, then click "Compare" to begin comparing.
				</p>
			</CardContent>
		</Card>
	</div>
);

export default function RepoDiffView() {
	const { repoPath } = useCurrentRepoParams();
	const location = useLocation();
	const routerState = location.state as DiffRouterState | undefined;

	if (!repoPath) {
		return <div>Error: No repository path provided</div>;
	}

	const diffSessions = useDiffSessions();
	const gitRefs = useGitRefs(repoPath);
	const diffOptions = useDiffOptions(routerState);

	const handleCreateDiff = useCallback(async () => {
		const options = { ...diffOptions.options, repoPath };
		await diffSessions.createSession(options);
	}, [diffOptions.options, repoPath, diffSessions]);

	return (
		<div className="flex flex-col h-full">
			<ViewToolbar
				diffOptions={diffOptions}
				gitRefs={gitRefs}
				onCreateDiff={handleCreateDiff}
				loading={diffSessions.loading}
			/>

			<SessionTabs
				sessions={diffSessions.sessions}
				selectedSessionId={diffSessions.selectedSessionId}
				onSelect={diffSessions.setSelectedSessionId}
				onClose={diffSessions.closeSession}
			/>

			<div className="flex-1 overflow-hidden min-h-0">
				{!!diffSessions.selectedSession?.directoryData && (
					<DirDiffViewer
						directoryData={diffSessions.selectedSession.directoryData}
						isLoading={false}
						isError={false}
						title={diffSessions.selectedSession.title}
						emptyMessage="No differences found between the selected references"
					/>
				)}
			</div>
		</div>
	);
}
