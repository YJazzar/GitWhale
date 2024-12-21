import { ModeToggle } from '@/components/mode-toggle';
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
import { Toaster } from '@/components/ui/toaster';
import { useEffect } from 'react';
import { useQuery } from 'react-query';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { GetStartupState } from './../wailsjs/go/backend/App';
import { PageRoutePaths, PageRoutes } from './PageRoutes';

export function OldAppSidebar() {
	const location = useLocation();
	const navigate = useNavigate();
	const sidebar = useSidebar();

	const startupStateQuery = useQuery({
		queryKey: ['GetStartupState'],
		queryFn: GetStartupState,
	});

	// Close the sidebar on mobile because it's nicer
	const onLinkClick = () => {
		sidebar.setOpenMobile(false);
	};

	const NavigateToDefaultRoute = async () => {
		let startupState = startupStateQuery.data;

		if (!!startupState?.directoryDiff) {
			navigate(PageRoutePaths.DirectoryDiff);
		} else {
			navigate(PageRoutes[0].url);
		}
	};

	// Navigates to the home page on startup
	useEffect(() => {
		// console.dir({location, startupStateQuery})
		// cant uncomment unless i do something like mentioned here: https://github.com/wailsapp/wails/issues/2262
		// if (location.pathname === '/' && startupStateQuery.data) {
		// 	NavigateToDefaultRoute();
		// }
	}, [location.pathname, startupStateQuery]);

	return (
		<Sidebar collapsible='icon'>
			<SidebarHeader>
				<SidebarTrigger />
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Application</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{PageRoutes.map((item) => (
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

export default function OldAppLayout() {
	return (
		<SidebarProvider>
			<OldAppSidebar />
			<main className="w-full h-full">
				<Outlet />
				<Toaster />
			</main>
		</SidebarProvider>
	);
}
