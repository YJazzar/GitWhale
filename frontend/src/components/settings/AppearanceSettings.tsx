import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Check, ChevronDown, Palette } from 'lucide-react';

export function AppearanceSettings() {
	const { theme, setTheme } = useTheme();

	return (
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
							<Button
								variant="outline"
								size="sm"
								className="w-full justify-between mt-1"
							>
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
	);
}