import { ModeToggle } from '@/components/mode-toggle';
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
import {
	RepoPageHandlersContext,
	SideBarMenuItem,
	useRepoPageHandlers,
} from '@/hooks/repo-page-handler-context';
import clsx from 'clsx';
import { GitGraph, House } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router';

export default function RepoPage() {
	const [dynamicMenuItems, setDynamicMenuItems] = useState<SideBarMenuItem[]>([]);

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

	return (
		<SidebarProvider>
			<RepoPageHandlersContext.Provider value={handlers}>
				<RepoPageSideBar dynamicMenuItems={dynamicMenuItems} />

				<div className="w-full h-full overflow-auto">
					{/* <code className="whitespace-pre-wrap">{JSON.stringify(location, null, 3)}</code>
			<code className="whitespace-pre-wrap">{JSON.stringify(params, null, 3)}</code> */}
					<Outlet />
				</div>
			</RepoPageHandlersContext.Provider>
		</SidebarProvider>
	);
}

function RepoPageSideBar(props: { dynamicMenuItems: SideBarMenuItem[] }) {
	const location = useLocation();
	const sidebar = useSidebar();

	const { encodedRepoPath } = useParams();
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
