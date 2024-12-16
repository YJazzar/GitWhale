import { ModeToggle } from '@/components/mode-toggle';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageRoutes } from './PageRoutes';

export function AppSidebar() {
	const location = useLocation();
	const navigate = useNavigate();
	const sidebar = useSidebar();

	// Close the sidebar on mobile because it's nicer
	const onLinkClick = () => {
		sidebar.setOpenMobile(false);
	};

	// Navigates to the home page on startup
	useEffect(() => {
		if (location.pathname === '/') {
			navigate(PageRoutes[0].url);
		}
	}, [location.pathname]);

	return (
		<Sidebar>
			{/* <SidebarHeader>Hi</SidebarHeader> */}

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

export default function AppLayout() {
	return (
		<SidebarProvider>
			<AppSidebar />
			<main className="w-full p-4">
				<SidebarTrigger />
				<Outlet />
				<Toaster />
			</main>
		</SidebarProvider>
	);
}
