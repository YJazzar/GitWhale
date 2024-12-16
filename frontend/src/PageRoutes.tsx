
import { FileDiff, Home } from 'lucide-react';
import DirDiffPage from './pages/DirDiffPage';
import HomePage from './pages/HomePage';

interface Route {
	title: string;
	url: PageRoutePaths;
	icon: JSX.Element;
	routeElement: JSX.Element;
}

export enum PageRoutePaths { 
	Home = "/", 
	DirectoryDiff = "/DirDiff"
}

// Menu items.
export const PageRoutes: Route[] = [
	{
		title: 'Home',
		url: PageRoutePaths.Home,
		icon: <Home/>,
		routeElement: <HomePage/>,
	},
	{
		title: 'Dir Diff',
		url: PageRoutePaths.DirectoryDiff,
		icon: <FileDiff/>,
		routeElement: <DirDiffPage/>,
	}
];
