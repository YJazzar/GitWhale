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
import { UseAppState } from '@/hooks/use-app-state';
import { House } from 'lucide-react';
import { Link, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router';

export default function RepoPage() {

	return (
		<SidebarProvider>
			<RepoPageSideBar />

			<div className="w-full h-full">
				<Outlet/>
			</div>
		</SidebarProvider>
	);
}

export function RepoHomeView() { 
	const params = useParams()

	return <code className='whitespace-pre-wrap'>
		{JSON.stringify(params, null, 3)}
	</code>
}

function RepoPageSideBar() {
	const location = useLocation();
	const sidebar = useSidebar();

	// Close the sidebar on mobile because it's nicer
	const onLinkClick = () => {
		sidebar.setOpenMobile(false);
	};

	const menuItems = [
		{
			title: 'test',
			isActive: true, // normally a computed value,
			url: '/url',
			icon: <House />,
		},
	];

	return (
		<Sidebar collapsible="icon" >
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
