import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, XCircle, CircleX } from 'lucide-react';

interface CommandStatusBadgeProps {
	status: number;
	size?: 'sm' | 'default';
}

export function CommandStatusBadge({ status, size = 'default' }: CommandStatusBadgeProps) {
	const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0 h-5' : '';
	const iconSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';

	switch (status) {
		case 0: // CommandRunning
			return (
				<Badge
					variant="secondary"
					className={`bg-yellow-500/10 text-yellow-500 border-yellow-500/20 ${sizeClasses}`}
				>
					<Loader2 className={`${iconSize} mr-0.5 animate-spin`} />
					Run
				</Badge>
			);
		case 1: // CommandSuccess
			return (
				<Badge
					variant="secondary"
					className={`bg-green-500/10 text-green-500 border-green-500/20 ${sizeClasses}`}
				>
					<CheckCircle className={`${iconSize} mr-0.5`} />
					OK
				</Badge>
			);
		case 2: // CommandFailed
			return (
				<Badge
					variant="secondary"
					className={`bg-red-500/10 text-red-500 border-red-500/20 ${sizeClasses}`}
				>
					<XCircle className={`${iconSize} mr-0.5`} />
					Fail
				</Badge>
			);
		case 3: // CommandCancelled
			return (
				<Badge
					variant="secondary"
					className={`bg-amber-500/10 text-amber-600 border-amber-500/20 ${sizeClasses}`}
				>
					<CircleX className={`${iconSize} mr-0.5`} />
					Cancel
				</Badge>
			);
		default:
			return (
				<Badge variant="outline" className={sizeClasses}>
					?
				</Badge>
			);
	}
}