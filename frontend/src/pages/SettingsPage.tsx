import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Terminal, GitBranch, Save, RotateCcw, Check, ChevronDown } from 'lucide-react';
import { useSettings } from '@/hooks/use-settings';
import {
	TERMINAL_COLOR_SCHEMES,
	TERMINAL_CURSOR_STYLES,
	COMMITS_LOAD_OPTIONS,
	FONT_SIZE_OPTIONS,
} from '@/types/settings';
import { UseAppState } from '@/hooks/state/use-app-state';

export default function SettingsPage() {
	const { appState } = UseAppState();
	const { settings, isLoading, updateSettings, resetSettings } = useSettings();
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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

	const handleReset = () => {
		resetSettings();
		setHasUnsavedChanges(false);
	};

	return (
		<div className="container mx-auto p-6 space-y-6">
			<div className="flex flex-col space-y-2">
				<h1 className="text-3xl font-bold tracking-tight">Settings</h1>
				<p className="text-muted-foreground">Configure your GitWhale preferences and settings.</p>
			</div>

			<div className="grid gap-6">
				{/* Git Settings */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<GitBranch className="w-5 h-5" />
							Git Configuration
						</CardTitle>
						<CardDescription>Configure Git-related settings and behaviors.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="space-y-2">
							<Label htmlFor="commits-to-load">Commits to Load</Label>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" className="w-full justify-between">
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
							<p className="text-xs text-muted-foreground">
								Number of git commits to display in the git log view.
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Terminal Settings */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Terminal className="w-5 h-5" />
							Terminal Configuration
						</CardTitle>
						<CardDescription>
							Configure terminal behavior, appearance, and default commands.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Default Command */}
						<div className="space-y-2">
							<Label htmlFor="terminal-command">Default Terminal Command</Label>
							<Input
								id="terminal-command"
								type="text"
								placeholder="Leave empty for system default shell"
								value={settings.terminal.defaultCommand}
								onChange={(e) =>
									handleTerminalSettingsChange('defaultCommand', e.target.value)
								}
							/>
							<p className="text-xs text-muted-foreground">
								Command to run when creating a new terminal session. Leave empty to use your
								system's default shell.
							</p>
						</div>

						<Separator />

						{/* Font Size */}
						<div className="space-y-2">
							<Label htmlFor="font-size">Font Size</Label>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" className="w-full justify-between">
										{FONT_SIZE_OPTIONS.find(
											(opt) => opt.value === settings.terminal.fontSize
										)?.label || `${settings.terminal.fontSize}px`}
										<ChevronDown className="h-4 w-4 opacity-50" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-full">
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
							<p className="text-xs text-muted-foreground">
								Font size for terminal text display.
							</p>
						</div>

						<Separator />

						{/* Color Scheme */}
						<div className="space-y-2">
							<Label htmlFor="color-scheme">Color Scheme</Label>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" className="w-full justify-between">
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
							<p className="text-xs text-muted-foreground">
								Color theme for the terminal interface.
							</p>
						</div>

						<Separator />

						{/* Cursor Style */}
						<div className="space-y-2">
							<Label htmlFor="cursor-style">Cursor Style</Label>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" className="w-full justify-between">
										{TERMINAL_CURSOR_STYLES.find(
											(opt) => opt.value === settings.terminal.cursorStyle
										)?.label || settings.terminal.cursorStyle}
										<ChevronDown className="h-4 w-4 opacity-50" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-full">
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
							<p className="text-xs text-muted-foreground">
								Visual style of the terminal cursor.
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Application Info & Actions */}
				<Card>
					<CardHeader>
						<CardTitle>Application Information</CardTitle>
						<CardDescription>Application details and settings management.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
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
						</div>

						<Separator />

						<div className="flex gap-3">
							<Button
								variant="destructive"
								size="sm"
								onClick={handleReset}
								className="flex items-center gap-2"
							>
								<RotateCcw className="w-4 h-4" />
								Reset to Defaults
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
