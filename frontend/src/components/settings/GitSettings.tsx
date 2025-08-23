import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/hooks/use-settings';
import { GitBranch } from 'lucide-react';

export function GitSettings() {
	const { settings, updateSettings } = useSettings();

	const handleGitSettingsChange = <T extends typeof settings.git, K extends keyof T>(key: K, value: T[K]) => {
		updateSettings({
			git: {
				...settings.git,
				[key]: value,
			},
		});
	};

	const handleUISettingsChange = <T extends typeof settings.ui, K extends keyof T>(key: K, value: T[K]) => {
		updateSettings({
			ui: {
				...settings.ui,
				[key]: value,
			},
		});
	};

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-lg">
					<GitBranch className="w-4 h-4" />
					Git
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div>
					<Label htmlFor="commits-to-load" className="text-sm font-medium">
						Commits to Load
					</Label>

					<Input
						id="commits-to-load"
						type="number"
						placeholder="100"
						value={settings.git.commitsToLoad === 0 ? undefined : settings.git.commitsToLoad}
						onChange={(e) => {
							handleGitSettingsChange('commitsToLoad', parseInt(e.target.value) || 0);
						}}
						className="mt-1"
					/>
				</div>
				<div>
					<Label htmlFor="commit-message-tab-width" className="text-sm font-medium">
						Commit Message Tab Width
					</Label>
					<Input
						id="commit-message-tab-width"
						type="number"
						placeholder="4"
						value={
							settings.git.commitMessageTabWidth === 0
								? undefined
								: settings.git.commitMessageTabWidth
						}
						onChange={(e) =>
							handleGitSettingsChange('commitMessageTabWidth', parseInt(e.target.value))
						}
						className="mt-1"
					/>
				</div>
				<div>
					<Label htmlFor="commit-message-wrap-limit" className="text-sm font-medium">
						Commit Message Wrap Limit Column
					</Label>
					<Input
						id="commit-message-wrap-limit"
						type="number"
						placeholder="70"
						value={
							settings.git.commitMessageWrapLimitCol === 0
								? undefined
								: settings.git.commitMessageWrapLimitCol
						}
						onChange={(e) =>
							handleGitSettingsChange('commitMessageWrapLimitCol', parseInt(e.target.value))
						}
						className="mt-1"
					/>
				</div>
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label className="text-sm font-medium">Auto-show Commit Details</Label>
						<p className="text-xs text-muted-foreground">
							Automatically open the commit details pane when selecting commits
						</p>
					</div>
					<Checkbox
						checked={settings.ui.autoShowCommitDetails}
						onCheckedChange={(checked) =>
							handleUISettingsChange('autoShowCommitDetails', !!checked)
						}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
