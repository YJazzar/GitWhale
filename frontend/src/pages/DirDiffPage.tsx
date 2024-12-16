import { useQuery } from 'react-query';
import { GetStartupState } from '../../wailsjs/go/main/App';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function DirDiffPage() {
	const startupStateQuery = useQuery({
		queryKey: ['GetStartupState'],
		queryFn: GetStartupState,
	});

	// const [data, setData] = useState<SessionDataInput[]>([]);

	// useEffect(() => {
	// 	getAllSessions().then((data) => setData(data));
	// });

	return (
		<div className="">

			<pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
				<code className="text-white">{JSON.stringify(startupStateQuery, null, 2)}</code>
			</pre>
		</div>
	);
}
