import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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

export default function RepoDiffView() {
	const { repoPath } = useCurrentRepoParams();
	const location = useLocation();
	const [loading, setLoading] = useState(false);
	const [loadedSessions, setLoadedSessions] = useState<backend.DiffSession[]>([]);
	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

	// Get initial state from router (for integration with git log)
	const routerState = location.state as DiffRouterState | undefined;

	// Diff options state
	const [fromRef, setFromRef] = useState<string>('HEAD');
	const [toRef, setToRef] = useState<string>(''); // Empty means working tree
	const [branches, setBranches] = useState<backend.GitRef[]>([]);
	const [tags, setTags] = useState<backend.GitRef[]>([]);
	const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
	const [filePathFilters, setFilePathFilters] = useState<string>(''); // Comma-separated paths

	if (!repoPath) {
		return <div>Error: No repository path provided</div>;
	}

	// Load branches and tags when component mounts
	useEffect(() => {
		loadRefsData(repoPath, setBranches, setTags);
	}, []);

	// // Auto-start diff if requested from router state
	// useEffect(() => {
	// 	if (routerState?.autoStart && routerState.fromRef && !loading && activeSessions.length === 0) {
	// 		createDiffSession();
	// 	}
	// }, [routerState, loading, activeSessions.length]);

	const createDiffSession = async () => {
		setLoading(true);
		try {
			const options = {
				repoPath: repoPath,
				fromRef: fromRef,
				toRef: toRef,
				filePathFilters: filePathFilters
					? filePathFilters
							.split(',')
							.map((p) => p.trim())
							.filter((p) => p)
					: [],
			};

			const session = await StartDiffSession(options);

			setLoadedSessions((prev) => [...prev, session]);
			setSelectedSessionId(session.sessionId);
		} catch (error) {
			console.error('Failed to create diff session:', error);
		} finally {
			setLoading(false);
		}
	};

	const closeDiffSession = async (sessionId: string) => {
		try {
			await EndDiffSession(sessionId);
			setLoadedSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));

			// If we closed the selected session, select another one or none
			if (selectedSessionId === sessionId) {
				const remainingSessions = loadedSessions.filter((s) => s.sessionId !== sessionId);
				setSelectedSessionId(remainingSessions.length > 0 ? remainingSessions[0].sessionId : null);
			}
		} catch (error) {
			console.error('Failed to close diff session:', error);
		}
	};

	const getDiffTypeDescription = () => {
		if (!toRef || toRef === '') {
			return `Comparing ${fromRef} with current changes`;
		}
		return `Comparing ${fromRef} with ${toRef}`;
	};

	const getQuickDiffOptions = () => [
		{ label: 'Current Changes vs HEAD', fromRef: 'HEAD', toRef: '' },
		{ label: 'Current Changes vs Staged', fromRef: '', toRef: 'HEAD' }, // Special case
		{ label: 'HEAD vs Previous Commit', fromRef: 'HEAD~1', toRef: 'HEAD' },
		{ label: 'HEAD vs 2 Commits Back', fromRef: 'HEAD~2', toRef: 'HEAD' },
	];

	const selectedSession = loadedSessions.find((s) => s.sessionId === selectedSessionId);
	const allRefs = [...branches, ...tags];

	return (
		<div className="flex flex-col h-full">
			{/* Compact Diff Options Header */}
			<div className="border-b bg-muted/20">
				<div className="p-3">
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center gap-3">
							<GitCompare className="w-4 h-4" />
							<span className="font-medium">Repository Diff</span>
						</div>
						<div className="flex items-center gap-2">
							<Button
								onClick={() => {
									loadRefsData(repoPath, setBranches, setTags);
								}}
								variant="outline"
								size="sm"
								disabled={loading}
								title="Refresh branches and tags"
							>
								<RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
							</Button>
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
									{getQuickDiffOptions().map((option, index) => (
										<DropdownMenuItem
											key={index}
											onClick={() => {
												setFromRef(option.fromRef);
												setToRef(option.toRef);
											}}
										>
											{option.label}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
							<Button onClick={() => setShowAdvanced(!showAdvanced)} variant="ghost" size="sm">
								{showAdvanced ? 'Simple' : 'Advanced'}
							</Button>
							<Button onClick={createDiffSession} disabled={loading || !fromRef} size="sm">
								{loading ? (
									<Loader2 className="w-3 h-3 animate-spin" />
								) : (
									<GitCompare className="w-3 h-3" />
								)}
								Compare
							</Button>
						</div>
					</div>

					{!showAdvanced ? (
						// Quick options
						<div className="space-y-3">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* From Reference */}
								<div className="space-y-2">
									<Label htmlFor="fromRef">Compare From</Label>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="outline" className="w-full justify-between">
												<span className="flex items-center gap-2">
													<GitBranch className="w-4 h-4" />
													{fromRef || 'Select ref...'}
												</span>
												<ChevronDown className="w-4 h-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent className="w-64">
											<DropdownMenuLabel>Select Reference</DropdownMenuLabel>
											<DropdownMenuSeparator />
											{allRefs.slice(0, 20).map((ref) => (
												<DropdownMenuItem
													key={ref.name}
													onClick={() => setFromRef(ref.name)}
												>
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

								{/* To Reference */}
								<div className="space-y-2">
									<Label htmlFor="toRef">Compare To</Label>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="outline" className="w-full justify-between">
												<span className="flex items-center gap-2">
													<FolderTree className="w-4 h-4" />
													{toRef || 'Current Changes'}
												</span>
												<ChevronDown className="w-4 h-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent className="w-64">
											<DropdownMenuLabel>Select Target</DropdownMenuLabel>
											<DropdownMenuSeparator />
											<DropdownMenuItem onClick={() => setToRef('')}>
												<span className="flex items-center gap-2">
													<FolderTree className="w-4 h-4" />
													Current Changes
												</span>
											</DropdownMenuItem>
											<DropdownMenuSeparator />
											{allRefs.slice(0, 20).map((ref) => (
												<DropdownMenuItem
													key={ref.name}
													onClick={() => setToRef(ref.name)}
												>
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
							</div>
						</div>
					) : (
						// Advanced options
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
							<div className="space-y-1">
								<Label htmlFor="fromRefInput" className="text-xs">
									Compare From
								</Label>
								<Input
									id="fromRefInput"
									value={fromRef}
									onChange={(e) => setFromRef(e.target.value)}
									placeholder="HEAD, branch, tag, commit hash..."
									className="text-xs h-8"
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="toRefInput" className="text-xs">
									Compare To
								</Label>
								<Input
									id="toRefInput"
									value={toRef}
									onChange={(e) => setToRef(e.target.value)}
									placeholder="Leave empty for current changes"
									className="text-xs h-8"
								/>
							</div>
							<div className="md:col-span-2 space-y-1">
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
					)}
				</div>
			</div>

			{/* Active Sessions Tabs */}
			{loadedSessions.length > 0 && (
				<div className="border-b bg-gradient-to-r from-muted/5 to-muted/10 backdrop-blur-sm">
					<div className="flex items-center gap-2 p-2 overflow-x-auto scrollbar-hide">
						{loadedSessions.map((session) => (
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
								onClick={() => setSelectedSessionId(session.sessionId)}
							>
								<span className="truncate text-sm font-medium">{session.title}</span>
								<button
									className="
										w-5 h-5 rounded-md flex items-center justify-center 
										transition-colors duration-150
										hover:bg-destructive/20 hover:text-destructive
										group-hover:opacity-100 opacity-60
									"
									onClick={(e) => {
										e.stopPropagation();
										closeDiffSession(session.sessionId);
									}}
									title="Close diff session"
								>
									<X className="w-3 h-3" />
								</button>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Diff Viewer with Routes */}
			<div className="flex-1 overflow-hidden min-h-0">
				<Routes>
					<Route
						index
						element={
							selectedSession ? (
								<Navigate to="no-file-selected" replace />
							) : (
								<div className="w-full h-full flex items-center justify-center">
									<Card className="w-96">
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<GitCompare className="w-5 h-5" />
												Repository Diff
											</CardTitle>
											<CardDescription>
												Compare different versions of your repository
											</CardDescription>
										</CardHeader>
										<CardContent>
											<p className="text-sm text-muted-foreground">
												Select your source and target references above, then click
												"Create Diff" to begin comparing.
											</p>
										</CardContent>
									</Card>
								</div>
							)
						}
					/>
					{/* <Route
						path="*"
						element={
							selectedSession ? (
								<DirDiffViewer
									directoryData={selectedSession.directoryData}
									isLoading={false}
									isError={false}
									title={selectedSession.title}
									emptyMessage="No differences found between the selected references"
								/>
							) : (
								<Navigate to="/" replace />
							)
						}
					/> */}
				</Routes>
			</div>
		</div>
	);
}

async function loadRefsData(
	repoPath: string,
	setBranches: React.Dispatch<React.SetStateAction<backend.GitRef[]>>,
	setTags: React.Dispatch<React.SetStateAction<backend.GitRef[]>>
) {
	try {
		const [branchesData, tagsData] = await Promise.all([GetBranches(repoPath), GetTags(repoPath)]);
		setBranches(branchesData || []);
		setTags(tagsData || []);
	} catch (error) {
		console.error('Failed to load refs:', error);
	}
}
