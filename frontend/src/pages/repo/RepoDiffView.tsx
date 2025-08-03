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
import {
	GitBranch,
	GitCompare,
	ChevronDown,
	Loader2,
	X,
	RefreshCw,
	FolderTree,
	FileText
} from 'lucide-react';
import { backend } from 'wailsjs/go/models';
import {
	StartDiffSession,
	EndDiffSession,
	GetDiffSessionData,
	GetBranches,
	GetTags
} from '../../../wailsjs/go/backend/App';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';
import { useLocation } from 'react-router';

interface DiffSessionInfo {
	sessionId: string;
	title: string;
	directoryData: backend.Directory | null;
}

interface DiffRouterState {
	fromRef?: string;
	toRef?: string;
	autoStart?: boolean;
}

export default function RepoDiffView() {
	const { repoPath } = useCurrentRepoParams();
	const location = useLocation();
	const [loading, setLoading] = useState(false);
	const [activeSessions, setActiveSessions] = useState<DiffSessionInfo[]>([]);
	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
	
	// Get initial state from router (for integration with git log)
	const routerState = location.state as DiffRouterState | undefined;
	
	// Diff options state
	const [fromRef, setFromRef] = useState(routerState?.fromRef || 'HEAD');
	const [toRef, setToRef] = useState(routerState?.toRef || ''); // Empty means working tree
	const [branches, setBranches] = useState<backend.GitRef[]>([]);
	const [tags, setTags] = useState<backend.GitRef[]>([]);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [contextLines, setContextLines] = useState(3);
	const [filePaths, setFilePaths] = useState<string>(''); // Comma-separated paths

	if (!repoPath) {
		return <div>Error: No repository path provided</div>;
	}

	// Load branches and tags when component mounts
	useEffect(() => {
		loadRefsData();
	}, [repoPath]);

	// Auto-start diff if requested from router state
	useEffect(() => {
		if (routerState?.autoStart && routerState.fromRef && !loading && activeSessions.length === 0) {
			createDiffSession();
		}
	}, [routerState, loading, activeSessions.length]);

	const loadRefsData = async () => {
		try {
			const [branchesData, tagsData] = await Promise.all([
				GetBranches(repoPath),
				GetTags(repoPath)
			]);
			setBranches(branchesData || []);
			setTags(tagsData || []);
		} catch (error) {
			console.error('Failed to load refs:', error);
		}
	};

	const createDiffSession = async () => {
		setLoading(true);
		try {
			const options = {
				repoPath: repoPath,
				fromRef: fromRef,
				toRef: toRef,
				filePaths: filePaths ? filePaths.split(',').map(p => p.trim()).filter(p => p) : [],
				contextLines: contextLines
			};

			const session = await StartDiffSession(options);
			const directoryData = await GetDiffSessionData(session.sessionId);
			
			const sessionInfo: DiffSessionInfo = {
				sessionId: session.sessionId,
				title: session.title,
				directoryData: directoryData
			};

			setActiveSessions(prev => [...prev, sessionInfo]);
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
			setActiveSessions(prev => prev.filter(s => s.sessionId !== sessionId));
			
			// If we closed the selected session, select another one or none
			if (selectedSessionId === sessionId) {
				const remainingSessions = activeSessions.filter(s => s.sessionId !== sessionId);
				setSelectedSessionId(remainingSessions.length > 0 ? remainingSessions[0].sessionId : null);
			}
		} catch (error) {
			console.error('Failed to close diff session:', error);
		}
	};

	const getDiffTypeDescription = () => {
		if (!toRef || toRef === '') {
			return `Comparing ${fromRef} with working tree`;
		}
		return `Comparing ${fromRef} with ${toRef}`;
	};

	const getQuickDiffOptions = () => [
		{ label: 'Working Tree vs HEAD', fromRef: 'HEAD', toRef: '' },
		{ label: 'Working Tree vs Staged', fromRef: '', toRef: 'HEAD' }, // Special case
		{ label: 'HEAD vs HEAD~1', fromRef: 'HEAD~1', toRef: 'HEAD' },
		{ label: 'HEAD vs HEAD~2', fromRef: 'HEAD~2', toRef: 'HEAD' },
	];

	const selectedSession = activeSessions.find(s => s.sessionId === selectedSessionId);
	const allRefs = [...branches, ...tags];

	return (
		<div className="flex flex-col h-full">
			{/* Diff Options Panel */}
			<div className="border-b bg-muted/30">
				<div className="p-4 space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold flex items-center gap-2">
							<GitCompare className="w-5 h-5" />
							Repository Diff
						</h2>
						<Button
							onClick={() => setShowAdvanced(!showAdvanced)}
							variant="outline"
							size="sm"
						>
							{showAdvanced ? 'Simple' : 'Advanced'} Options
						</Button>
					</div>

					{!showAdvanced ? (
						// Quick options
						<div className="space-y-3">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* From Reference */}
								<div className="space-y-2">
									<Label htmlFor="fromRef">From Reference</Label>
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
														{ref.type === 'tag' ? <FileText className="w-4 h-4" /> : <GitBranch className="w-4 h-4" />}
														{ref.name}
													</span>
												</DropdownMenuItem>
											))}
										</DropdownMenuContent>
									</DropdownMenu>
								</div>

								{/* To Reference */}
								<div className="space-y-2">
									<Label htmlFor="toRef">To Reference</Label>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="outline" className="w-full justify-between">
												<span className="flex items-center gap-2">
													<FolderTree className="w-4 h-4" />
													{toRef || 'Working Tree'}
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
													Working Tree
												</span>
											</DropdownMenuItem>
											<DropdownMenuSeparator />
											{allRefs.slice(0, 20).map((ref) => (
												<DropdownMenuItem
													key={ref.name}
													onClick={() => setToRef(ref.name)}
												>
													<span className="flex items-center gap-2">
														{ref.type === 'tag' ? <FileText className="w-4 h-4" /> : <GitBranch className="w-4 h-4" />}
														{ref.name}
													</span>
												</DropdownMenuItem>
											))}
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>

							{/* Quick Options */}
							<div className="flex flex-wrap gap-2">
								<Label className="text-sm text-muted-foreground">Quick options:</Label>
								{getQuickDiffOptions().map((option, index) => (
									<Button
										key={index}
										variant="outline"
										size="sm"
										onClick={() => {
											setFromRef(option.fromRef);
											setToRef(option.toRef);
										}}
									>
										{option.label}
									</Button>
								))}
							</div>
						</div>
					) : (
						// Advanced options
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="fromRefInput">From Reference</Label>
								<Input
									id="fromRefInput"
									value={fromRef}
									onChange={(e) => setFromRef(e.target.value)}
									placeholder="HEAD, branch, tag, commit hash..."
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="toRefInput">To Reference</Label>
								<Input
									id="toRefInput"
									value={toRef}
									onChange={(e) => setToRef(e.target.value)}
									placeholder="Leave empty for working tree"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="contextLines">Context Lines</Label>
								<Input
									id="contextLines"
									type="number"
									value={contextLines}
									onChange={(e) => setContextLines(parseInt(e.target.value) || 3)}
									min="0"
									max="20"
								/>
							</div>
							<div className="md:col-span-2 lg:col-span-3 space-y-2">
								<Label htmlFor="filePaths">File Paths (optional)</Label>
								<Input
									id="filePaths"
									value={filePaths}
									onChange={(e) => setFilePaths(e.target.value)}
									placeholder="src/, README.md, *.js (comma-separated)"
								/>
							</div>
						</div>
					)}

					{/* Diff description and action */}
					<div className="flex items-center justify-between pt-2">
						<p className="text-sm text-muted-foreground">
							{getDiffTypeDescription()}
						</p>
						<div className="flex items-center gap-2">
							<Button
								onClick={loadRefsData}
								variant="outline"
								size="sm"
								disabled={loading}
							>
								<RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
								Refresh Refs
							</Button>
							<Button
								onClick={createDiffSession}
								disabled={loading || !fromRef}
							>
								{loading ? (
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								) : (
									<GitCompare className="w-4 h-4 mr-2" />
								)}
								Create Diff
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Active Sessions Tabs */}
			{activeSessions.length > 0 && (
				<div className="border-b bg-muted/20">
					<div className="flex items-center gap-2 p-2 overflow-x-auto">
						{activeSessions.map((session) => (
							<Button
								key={session.sessionId}
								variant={selectedSessionId === session.sessionId ? "default" : "ghost"}
								size="sm"
								className="shrink-0 justify-between min-w-[200px]"
								onClick={() => setSelectedSessionId(session.sessionId)}
							>
								<span className="truncate">{session.title}</span>
								<span
									className="h-auto w-auto p-1 ml-2 hover:bg-destructive/20 rounded cursor-pointer flex items-center justify-center"
									onClick={(e) => {
										e.stopPropagation();
										closeDiffSession(session.sessionId);
									}}
								>
									<X className="w-3 h-3" />
								</span>
							</Button>
						))}
					</div>
				</div>
			)}

			{/* Diff Viewer */}
			<div className="flex-1 overflow-hidden">
				{selectedSession ? (
					<DirDiffViewer
						directoryData={selectedSession.directoryData}
						isLoading={false}
						isError={false}
						title={selectedSession.title}
						emptyMessage="No differences found between the selected references"
					/>
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
									Select your source and target references above, then click "Create Diff" to begin comparing.
								</p>
							</CardContent>
						</Card>
					</div>
				)}
			</div>
		</div>
	);
}