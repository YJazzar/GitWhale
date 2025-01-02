import { ModeToggle } from '@/components/mode-toggle';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Separator } from '@/components/ui/separator';
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
import XTermWrapper from '@/components/xterm-wrapper';
import {
	RepoPageHandlersContext,
	SideBarMenuItem,
	useRepoPageHandlers,
} from '@/hooks/repo-page-handler-context';
import { UseAppState } from '@/hooks/use-app-state';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';
import clsx from 'clsx';
import { GitGraph, House } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ImperativePanelHandle } from 'react-resizable-panels';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router';

export default function RepoPage() {
	const [dynamicMenuItems, setDynamicMenuItems] = useState<SideBarMenuItem[]>([]);
	const terminalResizablePanelRef = useRef<ImperativePanelHandle>(null);

	const handlers = {
		onAddNewDynamicRoute: (newItem: SideBarMenuItem) => {
			if (dynamicMenuItems.some((item) => item.url === newItem.url)) {
				// The item already exists in the menu
				return;
			}

			setDynamicMenuItems([...dynamicMenuItems, newItem]);
		},

		onCloseDynamicRoute: (oldItem: SideBarMenuItem) => {
			setDynamicMenuItems(dynamicMenuItems.filter((dynItem) => dynItem.url !== oldItem.url));
		},
	};

	// Handles the keyboard shortcut to close stuff
	// ... right now it only lets one of the file tab components from recognizing the short cut
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === 'j') {
				event.preventDefault();
				event.stopPropagation();

				if (terminalResizablePanelRef.current?.isCollapsed()) {
					terminalResizablePanelRef.current.expand();
				} else {
					terminalResizablePanelRef.current?.collapse();
				}
			}
		};

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [handlers]);

	return (
		<SidebarProvider>
			<RepoPageHandlersContext.Provider value={handlers}>
				<RepoPageSideBar dynamicMenuItems={dynamicMenuItems} />

				<ResizablePanelGroup direction="vertical">
					{/* Left pane that contains the file structure */}
					<ResizablePanel defaultSize={70} minSize={10}>
						<div className="w-full h-full overflow-auto">
							<Outlet />
						</div>
					</ResizablePanel>

					<ResizableHandle withHandle />

					{/* Right pain containing the actual diffs */}
					<ResizablePanel collapsible={true} minSize={5} ref={terminalResizablePanelRef}>
						<div className="w-full h-full overflow-auto">
							<XTermWrapper />
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</RepoPageHandlersContext.Provider>
		</SidebarProvider>
	);
}

function RepoPageSideBar(props: { dynamicMenuItems: SideBarMenuItem[] }) {
	const sidebar = useSidebar();
	const { appState } = UseAppState();

	const { encodedRepoPath, repoPath } = useCurrentRepoParams();
	const { dynamicMenuItems } = props;

	// Close the sidebar on mobile because it's nicer
	const onLinkClick = () => {
		sidebar.setOpenMobile(false);
	};

	const menuItems: SideBarMenuItem[] = [
		{
			title: 'Home',
			url: `/repo/${encodedRepoPath}/home`,
			icon: <House />,
		},
		{
			title: 'Log',
			url: `/repo/${encodedRepoPath}/log`,
			icon: <GitGraph />,
		},
	];
	const branchName = appState?.appConfig?.openGitRepos[repoPath]?.currentBranchName;

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<SidebarTrigger />
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>{branchName}</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{menuItems.map((item) => {
								return (
									<SidebarMenuItemRender
										key={item.url}
										menuItem={item}
										onLinkClick={onLinkClick}
										isDynamicRoute={false}
									/>
								);
							})}

							{dynamicMenuItems.length > 0 ? (
								<>
									<br />
									<Separator />
								</>
							) : null}

							{dynamicMenuItems.map((item) => {
								return (
									<SidebarMenuItemRender
										key={item.url}
										menuItem={item}
										onLinkClick={onLinkClick}
										isDynamicRoute
									/>
								);
							})}
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

function SidebarMenuItemRender(props: {
	menuItem: SideBarMenuItem;
	onLinkClick: () => void;
	isDynamicRoute: boolean;
}) {
	const { menuItem, onLinkClick, isDynamicRoute } = props;
	const repoPageHandlers = useRepoPageHandlers();

	const location = useLocation();
	const navigate = useNavigate();

	const onCloseClick = (event: React.MouseEvent<HTMLSpanElement>) => {
		event.preventDefault();
		event.stopPropagation();

		repoPageHandlers?.onCloseDynamicRoute(menuItem);
		if (location.pathname === menuItem.url) {
			console.log('navigating to prev');
			navigate(-1);
		}
	};

	return (
		<SidebarMenuItem>
			<SidebarMenuButton asChild isActive={menuItem.url === location.pathname}>
				<Link to={menuItem.url} onClick={onLinkClick} className="flex flex-row h-4 w-4">
					{menuItem.icon}
					<span className="grow">{menuItem.title}</span>

					{isDynamicRoute ? (
						<span
							className={clsx(
								'h-5 w-5 mr-1 box-border flex rounded-md items-center justify-center',
								'hover:bg-destructive text-destructive-foreground shadow-sm'
							)}
							onClick={onCloseClick}
						>
							x
						</span>
					) : null}
				</Link>
				{/* </div>	 */}
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}
