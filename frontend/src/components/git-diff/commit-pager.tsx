import { cn } from '@/lib/utils';
import { git_operations } from '../../../wailsjs/go/models';
import { Button } from '../ui/button';

interface CommitPagerProps {
	commitData: git_operations.DetailedCommitInfo;
	className?: string;
}

export function CommitPager(props: CommitPagerProps) {
	const { commitData, className } = props;

	return (
		<div className={cn('text-xs p-2', className)}>
			<code className="rounded font-mono max-h-11 overflow-auto">{commitData.commitMessage}</code>

			<div className="flex">
				<Button variant={'link'} size={'sm'}>
					Previous
				</Button>
				<div className='flex-grow'/>

				<Button variant={'link'} size={'sm'}>
					Next
				</Button>
			</div>
		</div>
	);
}
