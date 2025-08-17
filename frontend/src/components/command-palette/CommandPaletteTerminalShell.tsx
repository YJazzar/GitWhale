import { useCommandPaletteExecutor, useCommandPaletteState } from '@/hooks/command-palette/use-command-palette-state';

export function CommandPaletteTerminalShell() {
	const commandPaletteState = useCommandPaletteExecutor();

	return <div className="flex flex-col h-full"></div>;
}
