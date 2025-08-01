import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UseAppState } from '@/hooks/state/use-app-state';

export default function SettingsPage() {
	const { appState } = UseAppState();

	return (
		<div className="container mx-auto p-6 space-y-6">
			<div className="flex flex-col space-y-2">
				<h1 className="text-3xl font-bold tracking-tight">Settings</h1>
				<p className="text-muted-foreground">
					Configure your GitWhale preferences and settings.
				</p>
			</div>

			<div className="grid gap-6">
				{/* General Settings */}
				<Card>
					<CardHeader>
						<CardTitle>General</CardTitle>
						<CardDescription>
							General application settings and preferences.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<p className="text-sm font-medium">Dark Mode</p>
								<p className="text-xs text-muted-foreground">
									Toggle between light and dark theme
								</p>
							</div>
							<Button variant="outline" size="sm">
								Toggle Theme
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Git Settings */}
				<Card>
					<CardHeader>
						<CardTitle>Git Configuration</CardTitle>
						<CardDescription>
							Configure Git settings and default behaviors.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<p className="text-sm font-medium">Default Branch</p>
							<Button variant="outline" size="sm" disabled>
								Configure (Coming Soon)
							</Button>
						</div>
						<div className="space-y-2">
							<p className="text-sm font-medium">Author Settings</p>
							<Button variant="outline" size="sm" disabled>
								Configure (Coming Soon)
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Terminal Settings */}
				<Card>
					<CardHeader>
						<CardTitle>Terminal</CardTitle>
						<CardDescription>
							Configure terminal behavior and appearance.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<p className="text-sm font-medium">Default Shell</p>
							<p className="text-xs text-muted-foreground">
								Currently using system default shell
							</p>
						</div>
						<div className="space-y-2">
							<p className="text-sm font-medium">Font Size</p>
							<Button variant="outline" size="sm" disabled>
								Configure (Coming Soon)
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Application Info */}
				<Card>
					<CardHeader>
						<CardTitle>About</CardTitle>
						<CardDescription>
							Application information and version details.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<p className="text-sm font-medium">Version</p>
							<p className="text-xs text-muted-foreground">GitWhale v1.0.0</p>
						</div>
						<div className="space-y-2">
							<p className="text-sm font-medium">Repository Count</p>
							<p className="text-xs text-muted-foreground">
								{appState?.appConfig?.recentGitRepos?.length || 0} repositories tracked
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
