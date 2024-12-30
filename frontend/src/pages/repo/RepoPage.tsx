import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from '@/components/ui/sidebar';
import { UseAppState } from '@/hooks/use-app-state';
import { House, LucideBookOpenText } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router';
import { RunGitLog } from '../../../wailsjs/go/backend/App';
import { backend } from '../../../wailsjs/go/models';

export default function RepoPage() {
	const location = useLocation();
	const params = useParams();

	return (
		<SidebarProvider>
			<RepoPageSideBar />

			<div className="w-full h-full overflow-auto">
				{/* <code className="whitespace-pre-wrap">{JSON.stringify(location, null, 3)}</code>
			<code className="whitespace-pre-wrap">{JSON.stringify(params, null, 3)}</code> */}
				<Outlet />
			</div>
		</SidebarProvider>
	);
}

export function RepoHomeView() {
	const { encodedRepoPath } = useParams();
	const [logs, setLogs] = useState<backend.GitLogCommitInfo[]>([]);

	if (!encodedRepoPath) {
		return <>Error: why are we rendering RepoHomeView when there's no repo provided?</>;
	}

	const repoPath = atob(encodedRepoPath);

	const refreshLogs = async () => {
		console.debug("refreshing logs on ", repoPath)
		const newLogs = await RunGitLog(repoPath);
		console.debug("got: ", newLogs)
		setLogs(newLogs)
	};

	return (
		<>
			<Button onClick={refreshLogs}>Refresh </Button>
			Log results:
			{logs.map((log) => {
				return (
					<div key={log.commitHash}>
						<code className="whitespace-pre-wrap">{JSON.stringify(log, null, 3)}</code>
					</div>
				);
			})}
		</>
	);
}

function RepoPageSideBar() {
	const location = useLocation();
	const sidebar = useSidebar();

	const { encodedRepoPath } = useParams();

	// Close the sidebar on mobile because it's nicer
	const onLinkClick = () => {
		sidebar.setOpenMobile(false);
	};

	const menuItems = [
		{
			title: 'Home',
			url: `/repo/${encodedRepoPath}/home`,
			icon: <House />,
		},
		{
			title: 'Log',
			url: `/repo/${encodedRepoPath}/log`,
			icon: <LucideBookOpenText />,
		},
	];

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<SidebarTrigger />
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Application</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{menuItems.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild isActive={item.url === location.pathname}>
										<Link to={item.url} onClick={onLinkClick}>
											{item.icon}
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{/* Can have multiple SidebarGroups if necessary */}
			</SidebarContent>

			<SidebarFooter>
				<ModeToggle />
			</SidebarFooter>
		</Sidebar>
	);
}
