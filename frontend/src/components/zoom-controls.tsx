import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useAppZoom } from '@/hooks/use-app-zoom';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useCallback, useEffect, useState } from 'react';

interface ZoomControlsProps {
	variant?: 'default' | 'compact';
	showLabel?: boolean;
}

export const AVAILABLE_ZOOM_LEVELS = [25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 133, 140, 150, 175, 200, 250, 300, 400, 500];

export function ZoomControls({ variant = 'default', showLabel = true }: ZoomControlsProps) {
	const { zoomPercentage, zoomIn, zoomOut, resetZoom, canZoomIn, canZoomOut, isDefaultZoom, setZoom } =
		useAppZoom();

	// Add keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.ctrlKey || event.metaKey) {
				switch (event.key) {
					case '=':
					case '+':
						event.preventDefault();
						zoomIn();
						break;
					case '-':
						event.preventDefault();
						zoomOut();
						break;
					case '0':
						event.preventDefault();
						resetZoom();
						break;
				}
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [zoomIn, zoomOut, resetZoom]);

	
	const [customZoomInput, setCustomZoomInput] = useState('');

	const handleCustomZoomSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const value = parseFloat(customZoomInput);
		if (!isNaN(value) && value >= 25 && value <= 500) {
			setZoom(value / 100);
			setCustomZoomInput('');
		}
	};

	if (variant === 'compact') {
		return (
			<div className="flex items-center gap-1">
				<Button
					variant="ghost"
					size="sm"
					onClick={zoomOut}
					disabled={!canZoomOut}
					title="Zoom out (Ctrl+-)"
					className="h-7 w-7 p-0"
				>
					<Minus className="h-3 w-3" />
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="h-7 px-2 text-xs font-mono min-w-[3rem]"
							title="Click to select zoom level"
						>
							{zoomPercentage}%
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="center">
						<DropdownMenuLabel>Zoom Level</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{AVAILABLE_ZOOM_LEVELS.map((level) => (
							<DropdownMenuItem
								key={level}
								onClick={() => setZoom(level / 100)}
								className={zoomPercentage === level ? 'bg-accent' : ''}
							>
								{level}%{level === 100 && ' (Default)'}
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
						<div className="p-2">
							<form onSubmit={handleCustomZoomSubmit} className="flex gap-1">
								<Input
									type="number"
									placeholder="25-500"
									value={customZoomInput}
									onChange={(e) => setCustomZoomInput(e.target.value)}
									className="h-7 text-xs"
									min={25}
									max={500}
								/>
								<Button type="submit" size="sm" className="h-7 px-2 text-xs">
									Set
								</Button>
							</form>
						</div>
					</DropdownMenuContent>
				</DropdownMenu>

				<Button
					variant="ghost"
					size="sm"
					onClick={zoomIn}
					disabled={!canZoomIn}
					title="Zoom in (Ctrl++)"
					className="h-7 w-7 p-0"
				>
					<Plus className="h-3 w-3" />
				</Button>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2">
			{showLabel && <span className="text-sm text-muted-foreground">Zoom:</span>}

			<div className="flex items-center gap-1">
				<Button
					variant="outline"
					size="sm"
					onClick={zoomOut}
					disabled={!canZoomOut}
					title="Zoom out (Ctrl+-)"
				>
					<Minus className="h-4 w-4" />
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className="px-3 font-mono min-w-[4rem]"
							title="Click to select zoom level"
						>
							{zoomPercentage}%
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="center">
						<DropdownMenuLabel>Zoom Level</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{AVAILABLE_ZOOM_LEVELS.map((level) => (
							<DropdownMenuItem
								key={level}
								onClick={() => setZoom(level / 100)}
								className={zoomPercentage === level ? 'bg-accent' : ''}
							>
								{level}%{level === 100 && ' (Default)'}
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={resetZoom} disabled={isDefaultZoom}>
							<RotateCcw className="h-4 w-4 mr-2" />
							Reset to 100%
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<div className="p-2">
							<form onSubmit={handleCustomZoomSubmit} className="flex gap-2">
								<Input
									type="number"
									placeholder="25-500"
									value={customZoomInput}
									onChange={(e) => setCustomZoomInput(e.target.value)}
									className="h-8 text-sm"
									min={25}
									max={500}
								/>
								<Button type="submit" size="sm" className="h-8">
									Set
								</Button>
							</form>
						</div>
					</DropdownMenuContent>
				</DropdownMenu>

				<Button
					variant="outline"
					size="sm"
					onClick={zoomIn}
					disabled={!canZoomIn}
					title="Zoom in (Ctrl++)"
				>
					<Plus className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
