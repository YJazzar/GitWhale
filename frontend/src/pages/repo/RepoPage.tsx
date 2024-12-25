import { Button } from '@/components/ui/button';
import { OpenNewRepo } from '../../../wailsjs/go/backend/App';
import { Link, Outlet } from 'react-router';

export default function RepoPage() {
	return (
		<div className="">
			Repo Page
			<br />
			<Link to="/">Home</Link>
			<br />
			<Link to="/page-1">Page 1</Link>
			<br />
			<Link to="/page-1/file-1">Page 1 - file 1</Link>
			<br />
			<Outlet />
		</div>
	);
}
