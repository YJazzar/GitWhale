import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UseAppState } from '@/hooks/state/use-app-state';
import { useSettings } from '@/hooks/app-settings/use-settings';
import { RotateCcw } from 'lucide-react';

export function ApplicationInfo() {
	const { appState } = UseAppState();
	const { resetSettings } = useSettings();

	const handleReset = () => {
		resetSettings();
	};

	return (
		<Card className="lg:col-span-2">
			<CardHeader className="pb-3">
				<CardTitle className="text-lg">Application</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex items-center justify-between">
					<div className="flex gap-8">
						<div>
							<p className="text-sm font-medium">Version</p>
							<p className="text-xs text-muted-foreground">GitWhale v1.0.0</p>
						</div>
						<div>
							<p className="text-sm font-medium">Repositories</p>
							<p className="text-xs text-muted-foreground">
								{appState?.appConfig?.recentGitRepos?.length || 0} tracked
							</p>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={handleReset}
						className="flex items-center gap-2"
					>
						<RotateCcw className="w-4 h-4" />
						Reset
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}