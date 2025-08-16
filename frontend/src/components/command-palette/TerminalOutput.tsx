import { useCommandPaletteState } from '@/hooks/command-palette/use-command-palette-state';

export function TerminalOutput() {
	const commandPaletteState = useCommandPaletteState();

	return <div className="flex flex-col h-full"></div>;
}
