
import { BookOpen, CalendarClock, Home, Settings } from 'lucide-react';

interface Route {
	title: string;
	url: string;
	icon: JSX.Element;
	routeElement: JSX.Element;
}

// Menu items.
export const PageRoutes: Route[] = [
	{
		title: 'Home',
		url: '/home',
		icon: <Home/>,
		routeElement: <div>home</div>,
	},
	{
		title: 'Quran',
		url: '/quran',
		icon: <BookOpen/>,
		routeElement: <div>homqurane</div>,
	},
	{
		title: 'Sessions',
		url: '/sessions',
		icon: <CalendarClock/>,
		routeElement: <div>sess</div>,
	}
];
