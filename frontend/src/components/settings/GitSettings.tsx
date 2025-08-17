import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useSettings } from '@/hooks/use-settings';
import { COMMITS_LOAD_OPTIONS } from '@/types/settings';
import { Check, ChevronDown, GitBranch } from 'lucide-react';

export function GitSettings() {
	const { settings, updateSettings } = useSettings();

	const handleGitSettingsChange = (key: string, value: any) => {
		updateSettings({
			git: {
				...settings.git,
				[key]: value,
			},
		});
	};

	const handleUISettingsChange = (key: string, value: any) => {
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
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className="w-full justify-between mt-1"
							>
								{COMMITS_LOAD_OPTIONS.find(
									(opt) => opt.value === settings.git.commitsToLoad
								)?.label || `${settings.git.commitsToLoad} commits`}
								<ChevronDown className="h-4 w-4 opacity-50" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="w-full">
							{COMMITS_LOAD_OPTIONS.map((option) => (
								<DropdownMenuItem
									key={option.value}
									onClick={() =>
										handleGitSettingsChange('commitsToLoad', option.value)
									}
									className="flex items-center justify-between"
								>
									{option.label}
									{settings.git.commitsToLoad === option.value && (
										<Check className="h-4 w-4" />
									)}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
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
							handleUISettingsChange('autoShowCommitDetails', checked)
						}
					/>
				</div>
			</CardContent>
		</Card>
	);
}