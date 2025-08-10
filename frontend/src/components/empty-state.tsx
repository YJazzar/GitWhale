import { GitCompare } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';

export interface EmptyStateProps {
	title: () => JSX.Element;
	message: string;
}

// Empty state component (fallback)
export function EmptyState(props: EmptyStateProps) {
	const { title, message } = props;

	return (
		<div className="w-full h-full flex items-center justify-center">
			<Card className="w-96">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">{title()}</CardTitle>
					<CardDescription>{message}</CardDescription>
				</CardHeader>
			</Card>
		</div>
	);
}
