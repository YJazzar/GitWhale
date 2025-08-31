import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/hooks/app-settings/use-settings';
import { FONT_SIZE_OPTIONS, TERMINAL_COLOR_SCHEMES, TERMINAL_CURSOR_STYLES } from '@/types/settings';
import { Logger } from '@/utils/logger';
import { Check, ChevronDown, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GetTerminalDefaults } from '../../../wailsjs/go/backend/App';
import { backend } from '../../../wailsjs/go/models';

export function TerminalSettings() {
	const { settings, updateSettings } = useSettings();
	const [defaultShellCommands, setDefaultShellCommands] = useState<backend.TerminalDefaults | undefined>(
		undefined
	);

	useEffect(() => {
		GetTerminalDefaults()
			.then(setDefaultShellCommands)
			.catch((error) =>
				Logger.error(`Failed to get default shell command: ${error}`, 'TerminalSettings')
			);
	}, []);

	const handleTerminalSettingsChange = <T extends typeof settings.terminal, K extends keyof T>(
		key: K,
		value: T[K]
	) => {
		updateSettings({
			terminal: {
				...settings.terminal,
				[key]: value,
			},
		});
	};

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-lg">
					<Terminal className="w-4 h-4" />
					Terminal
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div>
					<Label htmlFor="terminal-interactive-command" className="text-sm font-medium">
						Interactive Shell Command
					</Label>
					<Input
						id="terminal-interactive-command"
						className="mt-1"
						placeholder={
							defaultShellCommands?.defaultInteractiveTerminalCommand || 'System default shell'
						}
						value={settings.terminal.defaultInteractiveTerminalCommand}
						onChange={(e) =>
							handleTerminalSettingsChange('defaultInteractiveTerminalCommand', e.target.value)
						}
					/>
				</div>

				<div>
					<Label htmlFor="terminal-background-command" className="text-sm font-medium">
						Background Shell Command
					</Label>
					<Input
						id="terminal-background-command"
						className="mt-1"
						placeholder={
							defaultShellCommands?.defaultShellForBackgroundCommands || 'System default shell'
						}
						value={settings.terminal.defaultShellForBackgroundCommands}
						onChange={(e) =>
							handleTerminalSettingsChange('defaultShellForBackgroundCommands', e.target.value)
						}
					/>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<div>
						<Label className="text-sm font-medium">Font Size</Label>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm" className="w-full justify-between mt-1">
									{FONT_SIZE_OPTIONS.find((opt) => opt.value === settings.terminal.fontSize)
										?.label || `${settings.terminal.fontSize}px`}
									<ChevronDown className="h-4 w-4 opacity-50" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								{FONT_SIZE_OPTIONS.map((option) => (
									<DropdownMenuItem
										key={option.value}
										onClick={() => handleTerminalSettingsChange('fontSize', option.value)}
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
									onClick={() => handleTerminalSettingsChange('colorScheme', option.value)}
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
	);
}
