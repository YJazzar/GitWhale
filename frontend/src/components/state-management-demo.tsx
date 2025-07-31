// /**
//  * Example component demonstrating how to use the global state management
//  * This shows various patterns for different types of state
//  */
export {};

// import React from 'react';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { 
// 	useCurrentRepo, 
// 	useFileTabs, 
// 	useTerminalSessions, 
// 	useRecentActivity,
// 	useAppState,
// 	usePanelSizes,
// 	useTheme
// } from '@/store/hooks';

// export function StateManagementDemo() {
// 	// App-level state
// 	const { appState, refreshAppState } = useAppState();
// 	const { theme, setTheme } = useTheme();
	
// 	// Repository state
// 	const { 
// 		currentRepoPath, 
// 		commits, 
// 		selectedCommit, 
// 		loading, 
// 		setCommits, 
// 		setSelectedCommit, 
// 		setLoading 
// 	} = useCurrentRepo();
	
// 	// File tabs state
// 	const { 
// 		fileTabs, 
// 		activeTabKey, 
// 		openFile, 
// 		closeFile, 
// 		getActiveFile 
// 	} = useFileTabs();
	
// 	// Terminal sessions state
// 	const { sessions, addSession, removeSession } = useTerminalSessions();
	
// 	// Recent activity state
// 	const { activities, addActivity } = useRecentActivity();
	
// 	// Panel sizes state
// 	const { getPanelSizes, savePanelSizes } = usePanelSizes();

// 	const handleAddMockCommit = () => {
// 		const mockCommit = {
// 			commitHash: `mock-${Date.now()}`,
// 			commitMessage: [`Mock commit ${Date.now()}`],
// 			username: 'demo-user',
// 			userEmail: 'demo@example.com',
// 			commitTimeStamp: Math.floor(Date.now() / 1000).toString(),
// 			authoredTimeStamp: Math.floor(Date.now() / 1000).toString(),
// 			parentCommitHashes: [],
// 			refs: '',
// 			shortStat: '+1 -0'
// 		};
		
// 		setCommits([mockCommit, ...commits]);
		
// 		// Add to recent activity
// 		addActivity({
// 			type: 'commit_viewed',
// 			data: { commitHash: mockCommit.commitHash, repoPath: currentRepoPath }
// 		});
// 	};

// 	const handleAddMockTab = () => {
// 		const tabId = `demo-tab-${Date.now()}`;
// 		openFile({
// 			tabKey: tabId,
// 			linkPath: `/demo/${tabId}`,
// 			title: `Demo Tab ${Date.now()}`,
// 			isPermanentlyOpen: false,
// 			preventUserClose: false,
// 			titleRender: () => <span>📄 Demo Tab</span>
// 		});
// 	};

// 	const handleAddMockTerminal = () => {
// 		const sessionId = `demo-terminal-${Date.now()}`;
// 		addSession({
// 			id: sessionId,
// 			repoPath: currentRepoPath || '/demo/path',
// 			isActive: true,
// 			lastCommand: 'git status'
// 		});
// 	};

// 	const handleToggleTheme = () => {
// 		setTheme(theme === 'dark' ? 'light' : 'dark');
// 	};

// 	const handleSavePanelSizes = () => {
// 		savePanelSizes('demo-panel', [60, 40]);
// 	};

// 	const demoSizes = getPanelSizes('demo-panel', [50, 50]);

// 	return (
// 		<div className="p-6 space-y-6">
// 			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				
// 				{/* App State */}
// 				<Card>
// 					<CardHeader>
// 						<CardTitle>App State</CardTitle>
// 					</CardHeader>
// 					<CardContent className="space-y-2">
// 						<p className="text-sm text-muted-foreground">
// 							Current theme: <Badge>{theme}</Badge>
// 						</p>
// 						<p className="text-sm text-muted-foreground">
// 							App loaded: <Badge variant={appState ? 'default' : 'destructive'}>
// 								{appState ? 'Yes' : 'No'}
// 							</Badge>
// 						</p>
// 						<div className="space-y-2">
// 							<Button onClick={handleToggleTheme} size="sm">
// 								Toggle Theme
// 							</Button>
// 							<Button onClick={refreshAppState} size="sm" variant="outline">
// 								Refresh App State
// 							</Button>
// 						</div>
// 					</CardContent>
// 				</Card>

// 				{/* Repository State */}
// 				<Card>
// 					<CardHeader>
// 						<CardTitle>Repository State</CardTitle>
// 					</CardHeader>
// 					<CardContent className="space-y-2">
// 						<p className="text-sm text-muted-foreground">
// 							Current repo: <code className="text-xs">{currentRepoPath || 'None'}</code>
// 						</p>
// 						<p className="text-sm text-muted-foreground">
// 							Commits loaded: <Badge>{commits.length}</Badge>
// 						</p>
// 						<p className="text-sm text-muted-foreground">
// 							Selected commit: <Badge variant={selectedCommit ? 'default' : 'secondary'}>
// 								{selectedCommit ? selectedCommit.commitHash.slice(0, 7) : 'None'}
// 							</Badge>
// 						</p>
// 						<p className="text-sm text-muted-foreground">
// 							Loading: <Badge variant={loading ? 'destructive' : 'default'}>
// 								{loading ? 'Yes' : 'No'}
// 							</Badge>
// 						</p>
// 						<Button onClick={handleAddMockCommit} size="sm">
// 							Add Mock Commit
// 						</Button>
// 					</CardContent>
// 				</Card>

// 				{/* File Tabs State */}
// 				<Card>
// 					<CardHeader>
// 						<CardTitle>File Tabs State</CardTitle>
// 					</CardHeader>
// 					<CardContent className="space-y-2">
// 						<p className="text-sm text-muted-foreground">
// 							Open tabs: <Badge>{fileTabs.length}</Badge>
// 						</p>
// 						<p className="text-sm text-muted-foreground">
// 							Active tab: <code className="text-xs">{activeTabKey || 'None'}</code>
// 						</p>
// 						<div className="space-y-1">
// 							{fileTabs.slice(0, 3).map(tab => (
// 								<div key={tab.tabKey} className="flex items-center justify-between">
// 									<span className="text-xs truncate">{tab.title}</span>
// 									<Button 
// 										onClick={() => closeFile(tab.tabKey)} 
// 										size="sm" 
// 										variant="ghost"
// 										className="h-6 w-6 p-0"
// 									>
// 										×
// 									</Button>
// 								</div>
// 							))}
// 						</div>
// 						<Button onClick={handleAddMockTab} size="sm">
// 							Add Mock Tab
// 						</Button>
// 					</CardContent>
// 				</Card>

// 				{/* Terminal Sessions State */}
// 				<Card>
// 					<CardHeader>
// 						<CardTitle>Terminal Sessions</CardTitle>
// 					</CardHeader>
// 					<CardContent className="space-y-2">
// 						<p className="text-sm text-muted-foreground">
// 							Active sessions: <Badge>{sessions.length}</Badge>
// 						</p>
// 						<div className="space-y-1">
// 							{sessions.slice(0, 3).map(session => (
// 								<div key={session.id} className="flex items-center justify-between">
// 									<span className="text-xs truncate">{session.repoPath}</span>
// 									<Button 
// 										onClick={() => removeSession(session.id)} 
// 										size="sm" 
// 										variant="ghost"
// 										className="h-6 w-6 p-0"
// 									>
// 										×
// 									</Button>
// 								</div>
// 							))}
// 						</div>
// 						<Button onClick={handleAddMockTerminal} size="sm">
// 							Add Mock Terminal
// 						</Button>
// 					</CardContent>
// 				</Card>

// 				{/* Recent Activity State */}
// 				<Card>
// 					<CardHeader>
// 						<CardTitle>Recent Activity</CardTitle>
// 					</CardHeader>
// 					<CardContent className="space-y-2">
// 						<p className="text-sm text-muted-foreground">
// 							Recent activities: <Badge>{activities.length}</Badge>
// 						</p>
// 						<div className="space-y-1 max-h-32 overflow-y-auto">
// 							{activities.slice(0, 5).map(activity => (
// 								<div key={activity.id} className="text-xs">
// 									<Badge variant="outline" className="mr-1">
// 										{activity.type}
// 									</Badge>
// 									<span className="text-muted-foreground">
// 										{new Date(activity.timestamp).toLocaleTimeString()}
// 									</span>
// 								</div>
// 							))}
// 						</div>
// 					</CardContent>
// 				</Card>

// 				{/* Panel Sizes State */}
// 				<Card>
// 					<CardHeader>
// 						<CardTitle>Panel Sizes</CardTitle>
// 					</CardHeader>
// 					<CardContent className="space-y-2">
// 						<p className="text-sm text-muted-foreground">
// 							Demo panel sizes: <Badge>{demoSizes.join('%, ')}%</Badge>
// 						</p>
// 						<Button onClick={handleSavePanelSizes} size="sm">
// 							Save Demo Sizes (60/40)
// 						</Button>
// 					</CardContent>
// 				</Card>

// 			</div>

// 			<Card>
// 				<CardHeader>
// 					<CardTitle>State Persistence Benefits</CardTitle>
// 				</CardHeader>
// 				<CardContent>
// 					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
// 						<div>
// 							<h4 className="font-semibold mb-2">✅ With Global State:</h4>
// 							<ul className="text-sm space-y-1 text-muted-foreground">
// 								<li>• Commits persist across navigation</li>
// 								<li>• Selected commit state maintained</li>
// 								<li>• Panel sizes remembered</li>
// 								<li>• Terminal sessions preserved</li>
// 								<li>• Theme settings persist</li>
// 								<li>• File tabs state maintained</li>
// 								<li>• Activity history tracked</li>
// 							</ul>
// 						</div>
// 						<div>
// 							<h4 className="font-semibold mb-2">❌ Without Global State:</h4>
// 							<ul className="text-sm space-y-1 text-muted-foreground">
// 								<li>• Commits reload on every navigation</li>
// 								<li>• Selected commit lost</li>
// 								<li>• Panel sizes reset</li>
// 								<li>• Terminal sessions disconnected</li>
// 								<li>• Theme resets to default</li>
// 								<li>• File tabs close unexpectedly</li>
// 								<li>• No activity tracking</li>
// 							</ul>
// 						</div>
// 					</div>
// 				</CardContent>
// 			</Card>
// 		</div>
// 	);
// }
