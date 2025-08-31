import { useLoggedShellCommandsState } from '@/hooks/state/use-logged-shell-commands-state';

export function LoggedShellCommandStatistics() {
	const { statistics } = useLoggedShellCommandsState();
	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-2 lg:gap-4 mb-3 px-3 py-2 bg-muted/30 rounded-lg overflow-x-auto">
			<StatItem label="Total" value={statistics.total} />
			<StatItem label="Running" value={statistics.running} valueClassName="text-yellow-500" />
			<StatItem label="Success" value={statistics.success} valueClassName="text-green-500" />
			<StatItem label="Failed" value={statistics.failed} valueClassName="text-red-500" />
			<StatItem
				label="Success Rate"
				value={`${statistics.successRate.toFixed(0)}%`}
				className="col-span-2 sm:col-span-1"
			/>
		</div>
	);
}

interface StatItemProps {
	label: string;
	value: string | number;
	valueClassName?: string;
	className?: string;
}

function StatItem({ label, value, valueClassName, className }: StatItemProps) {
	return (
		<div className={`flex items-center gap-1 whitespace-nowrap ${className || ''}`}>
			<span className="text-xs font-medium">{label}:</span>
			<span className={`text-sm font-bold ${valueClassName || ''}`}>{value}</span>
		</div>
	);
}
