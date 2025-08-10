import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UseAppState } from '@/hooks/state/use-app-state';
import { useSettings } from '@/hooks/use-settings';
import {
	COMMITS_LOAD_OPTIONS,
	FONT_SIZE_OPTIONS,
	TERMINAL_COLOR_SCHEMES,
	TERMINAL_CURSOR_STYLES,
} from '@/types/settings';
import { Logger } from '@/utils/logger';
import { Check, ChevronDown, GitBranch, Palette, RotateCcw, Settings2, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GetDefaultShellCommand } from '../../wailsjs/go/backend/App';
import { Checkbox } from '@/components/ui/checkbox';

export default function SettingsPage() {
	const { appState } = UseAppState();
	const { settings, isLoading, updateSettings, resetSettings } = useSettings();
	const { theme, setTheme } = useTheme();
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [defaultShellCommand, setDefaultShellCommand] = useState('');

	useEffect(() => {
		GetDefaultShellCommand().then(setDefaultShellCommand).catch(error => 
			Logger.error(`Failed to get default shell command: ${error}`, 'SettingsPage')
		);
	}, []);

	if (isLoading) {
		return (
			<div className="container mx-auto p-6">
				<div className="flex items-center justify-center h-32">
					<div className="text-muted-foreground">Loading settings...</div>
				</div>
			</div>
		);
	}

	const handleGitSettingsChange = (key: string, value: any) => {
		updateSettings({
			git: {
				...settings.git,
				[key]: value,
			},
		});
		setHasUnsavedChanges(false); // Changes are auto-saved
	};

	const handleTerminalSettingsChange = (key: string, value: any) => {
		updateSettings({
			terminal: {
				...settings.terminal,
				[key]: value,
			},
		});
		setHasUnsavedChanges(false); // Changes are auto-saved
	};

	const handleUISettingsChange = (key: string, value: any) => {
		updateSettings({
			ui: {
				...settings.ui,
				[key]: value,
			},
		});
		setHasUnsavedChanges(false); // Changes are auto-saved
	};

	const handleReset = () => {
		resetSettings();
		setHasUnsavedChanges(false);
	};

	return (
		<div className="container mx-auto p-4 max-w-4xl">
			<div className="mb-6">
				<h1 className="text-2xl font-bold">Settings</h1>
				<p className="text-sm text-muted-foreground">Configure your GitWhale preferences</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{/* Git Settings */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-lg">
							<GitBranch className="w-4 h-4" />
							Git
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div>
							<Label htmlFor="commits-to-load" className="text-sm font-medium">Commits to Load</Label>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm" className="w-full justify-between mt-1">
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
					</CardContent>
				</Card>

				{/* UI Settings */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-lg">
							<Settings2 className="w-4 h-4" />
							General
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
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

				{/* Terminal Settings */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-lg">
							<Terminal className="w-4 h-4" />
							Terminal
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div>
							<Label htmlFor="terminal-command" className="text-sm font-medium">Default Command</Label>
							<Input
								id="terminal-command"
								className="mt-1"
								placeholder={defaultShellCommand || "System default shell"}
								value={settings.terminal.defaultCommand}
								onChange={(e) =>
									handleTerminalSettingsChange('defaultCommand', e.target.value)
								}
							/>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label className="text-sm font-medium">Font Size</Label>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline" size="sm" className="w-full justify-between mt-1">
											{FONT_SIZE_OPTIONS.find(
												(opt) => opt.value === settings.terminal.fontSize
											)?.label || `${settings.terminal.fontSize}px`}
											<ChevronDown className="h-4 w-4 opacity-50" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										{FONT_SIZE_OPTIONS.map((option) => (
											<DropdownMenuItem
												key={option.value}
												onClick={() =>
													handleTerminalSettingsChange('fontSize', option.value)
												}
												className="flex items-center justify-between"
											>
												{option.label}
												{settings.terminal.fontSize === option.value && (
													<Check className="h-4 w-4" />
												)}
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							</div>

							<div>
								<Label className="text-sm font-medium">Cursor Style</Label>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline" size="sm" className="w-full justify-between mt-1">
											{TERMINAL_CURSOR_STYLES.find(
												(opt) => opt.value === settings.terminal.cursorStyle
											)?.label || settings.terminal.cursorStyle}
											<ChevronDown className="h-4 w-4 opacity-50" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										{TERMINAL_CURSOR_STYLES.map((option) => (
											<DropdownMenuItem
												key={option.value}
												onClick={() =>
													handleTerminalSettingsChange('cursorStyle', option.value)
												}
												className="flex items-center justify-between"
											>
												{option.label}
												{settings.terminal.cursorStyle === option.value && (
													<Check className="h-4 w-4" />
												)}
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>

						<div>
							<Label className="text-sm font-medium">Color Scheme</Label>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm" className="w-full justify-between mt-1">
										{TERMINAL_COLOR_SCHEMES.find(
											(opt) => opt.value === settings.terminal.colorScheme
										)?.label || settings.terminal.colorScheme}
										<ChevronDown className="h-4 w-4 opacity-50" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-full">
									{TERMINAL_COLOR_SCHEMES.map((option) => (
										<DropdownMenuItem
											key={option.value}
											onClick={() =>
												handleTerminalSettingsChange('colorScheme', option.value)
											}
											className="flex items-center justify-between"
										>
											{option.label}
											{settings.terminal.colorScheme === option.value && (
												<Check className="h-4 w-4" />
											)}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</CardContent>
				</Card>

				{/* Appearance Settings */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-lg">
							<Palette className="w-4 h-4" />
							Appearance
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div>
							<Label className="text-sm font-medium">Theme</Label>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm" className="w-full justify-between mt-1">
										{theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'}
										<ChevronDown className="h-4 w-4 opacity-50" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-full">
									<DropdownMenuItem
										onClick={() => setTheme('light')}
										className="flex items-center justify-between"
									>
										Light
										{theme === 'light' && <Check className="h-4 w-4" />}
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => setTheme('dark')}
										className="flex items-center justify-between"
									>
										Dark
										{theme === 'dark' && <Check className="h-4 w-4" />}
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => setTheme('system')}
										className="flex items-center justify-between"
									>
										System
										{theme === 'system' && <Check className="h-4 w-4" />}
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</CardContent>
				</Card>

				{/* Application Info */}
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
			</div>
		</div>
	);
}
