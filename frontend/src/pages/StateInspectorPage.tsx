import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useStateInspectorValues } from '@/hooks/state/use-state-inspector-values';
import {
	Bug,
	Copy,
	Database,
	Palette,
	Search,
	Sidebar,
	Terminal
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

function formatGroupTitle(groupKey: string): string {
	return groupKey
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, str => str.toUpperCase())
		// .replace(/Atoms$/, '')
		.trim();
}

function formatAtomLabel(atomKey: string): string {
	return atomKey
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, str => str.toUpperCase())
		.trim();
}

function getGroupIcon(groupKey: string): React.ReactNode {
	const iconMap: Record<string, React.ReactNode> = {
		appStateAtoms: <Database className="w-4 h-4" />,
		applicationLogsStateAtoms: <Terminal className="w-4 h-4" />,
		commandPaletteStateAtoms: <Palette className="w-4 h-4" />,
		commandRegistryStateAtoms: <Terminal className="w-4 h-4" />,
		customCommandStateAtoms: <Terminal className="w-4 h-4" />,
		fileTabsStateAtoms: <Bug className="w-4 h-4" />,
		sidebarStateAtoms: <Sidebar className="w-4 h-4" />,
		gitDiffStateAtoms: <Search className="w-4 h-4" />,
		gitHomeStateAtoms: <Database className="w-4 h-4" />,
		gitLogStateAtoms: <Terminal className="w-4 h-4" />,
	};
	
	return iconMap[groupKey] || <Bug className="w-4 h-4" />;
}

export default function StateInspectorPage() {
	const [searchQuery, setSearchQuery] = useState('');

	// Get all state values
	const allStateValues = useStateInspectorValues();

	const handleCopyAll = useCallback(() => {
		const allStateJson = JSON.stringify(allStateValues, null, 2);
		navigator.clipboard.writeText(allStateJson);
	}, [allStateValues]);

	// Calculate state statistics
	const stateStats = useMemo(() => {
		const flatten = (obj: any, prefix = ''): Array<{ key: string; value: any }> => {
			let result: Array<{ key: string; value: any }> = [];
			for (const [key, value] of Object.entries(obj)) {
				const fullKey = prefix ? `${prefix}.${key}` : key;
				if (value && typeof value === 'object' && !Array.isArray(value)) {
					result = result.concat(flatten(value, fullKey));
				} else {
					result.push({ key: fullKey, value });
				}
			}
			return result;
		};

		const flatStates = flatten(allStateValues);
		const filteredStates = searchQuery
			? flatStates.filter(
					(state) =>
						state.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
						String(state.value).toLowerCase().includes(searchQuery.toLowerCase())
			  )
			: flatStates;

		return {
			total: flatStates.length,
			filtered: filteredStates.length,
		};
	}, [allStateValues, searchQuery]);

	return (
		<div className="h-full flex flex-col">
			{/* Toolbar */}
			<div className="border-b bg-muted/20 p-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-primary/10 text-primary">
							<Bug className="w-5 h-5" />
						</div>
						<div>
							<h1 className="font-semibold text-lg">State Inspector</h1>
							<p className="text-sm text-muted-foreground">
								Debug and monitor application state
							</p>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						{/* Search */}
						<div className="relative">
							<Search className="w-4 h-4 text-muted-foreground absolute left-2 top-1/2 transform -translate-y-1/2" />
							<Input
								placeholder="Search state variables..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-8 w-64 sm:w-48 lg:w-64"
							/>
						</div>
						<Separator orientation="vertical" className="h-6 mx-2" />

						<Button
							onClick={handleCopyAll}
							variant="outline"
							size="sm"
							title="Copy all state to clipboard"
						>
							<Copy className="w-3 h-3 mr-1" />
							Copy All
						</Button>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 min-h-0 p-4 overflow-auto">
				<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-w-none">
					{Object.entries(allStateValues).map(([groupKey, valuesGroup]) => (
						<StateSection
							key={groupKey}
							title={formatGroupTitle(groupKey)}
							icon={getGroupIcon(groupKey)}
							searchQuery={searchQuery}
						>
							<div className="space-y-3">
								{Object.entries(valuesGroup).map(([atomKey, value]) => (
									<StateDisplay
										key={atomKey}
										label={formatAtomLabel(atomKey)}
										value={value}
										searchQuery={searchQuery}
									/>
								))}
							</div>
						</StateSection>
					))}
				</div>
			</div>

			{/* Status Bar */}
			<div className="border-t bg-muted/10 px-4 py-2">
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<span>
						State variables loaded: {stateStats.total} | Filtered: {stateStats.filtered}
					</span>
					<div className="flex items-center gap-4">
						<span>Data size: {'<placeholder>'}</span>
					</div>
				</div>
			</div>
		</div>
	);
}

interface StateSectionProps {
	title: string;
	icon: React.ReactNode;
	children: React.ReactNode;
	searchQuery: string;
}

function StateSection({ title, icon, children, searchQuery }: StateSectionProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);

	// Filter section content based on search query
	const shouldShowSection = useMemo(() => {
		if (!searchQuery) return true;
		return title.toLowerCase().includes(searchQuery.toLowerCase());
	}, [title, searchQuery]);

	if (!shouldShowSection) {
		return null;
	}

	return (
		<div className="border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow">
			<div
				className="p-4 border-b cursor-pointer hover:bg-muted/50 flex items-center justify-between group transition-colors"
				onClick={() => setIsCollapsed(!isCollapsed)}
			>
				<div className="flex items-center gap-3">
					<div className="p-1 rounded-md bg-primary/10 text-primary">{icon}</div>
					<span className="font-semibold text-foreground">{title}</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
						{isCollapsed ? '▶' : '▼'}
					</span>
				</div>
			</div>
			{!isCollapsed && <div className="p-4">{children}</div>}
		</div>
	);
}

interface StateDisplayProps {
	label: string;
	value: unknown;
	searchQuery?: string;
}

function StateDisplay({ label, value, searchQuery }: StateDisplayProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	const formatValue = (val: unknown): string => {
		if (val === null) return 'null';
		if (val === undefined) return 'undefined';
		if (typeof val === 'string') return `"${val}"`;
		if (typeof val === 'number' || typeof val === 'boolean') return String(val);
		if (typeof val === 'object') {
			try {
				return JSON.stringify(val, null, isExpanded ? 2 : 0);
			} catch {
				return '[Object] (threw exception while stringify-ing)';
			}
		}
		return String(val);
	};

	const isComplexValue = typeof value === 'object' && value !== null;
	const displayValue = formatValue(value);

	// Check if this item matches the search query
	const matchesSearch = useMemo(() => {
		if (!searchQuery) return true;
		const query = searchQuery.toLowerCase();
		return label.toLowerCase().includes(query) || displayValue.toLowerCase().includes(query);
	}, [label, displayValue, searchQuery]);

	// Don't render if doesn't match search
	if (!matchesSearch) {
		return null;
	}

	// Get value color based on type
	const getValueColor = (val: unknown): string => {
		if (val === null || val === undefined) return 'text-muted-foreground';
		if (typeof val === 'boolean') return val ? 'text-green-600' : 'text-red-600';
		if (typeof val === 'number') return 'text-blue-600';
		if (typeof val === 'string') return 'text-purple-600';
		return 'text-foreground';
	};

	return (
		<div className="border rounded p-3 bg-background hover:bg-muted/30 transition-colors">
			<div className="flex items-start justify-between gap-2">
				<span className="text-sm font-medium text-muted-foreground min-w-0 flex-1">{label}:</span>
				<div className="flex items-center gap-1 shrink-0">
					<span
						className={`text-xs px-1.5 py-0.5 rounded-full border ${getValueColor(
							value
						)} bg-muted/50`}
					>
						{typeof value}
					</span>
					{isComplexValue && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setIsExpanded(!isExpanded)}
							className="h-6 w-6 p-0 hover:bg-muted"
							title={isExpanded ? 'Collapse' : 'Expand'}
						>
							{isExpanded ? '−' : '+'}
						</Button>
					)}
					<Button
						variant="ghost"
						size="sm"
						onClick={() => navigator.clipboard.writeText(displayValue)}
						className="h-6 w-6 p-0 hover:bg-muted"
						title="Copy value"
					>
						<Copy className="w-3 h-3" />
					</Button>
				</div>
			</div>
			<div className="mt-2">
				<div
					className={`text-xs ${getValueColor(value)} ${
						isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-3'
					} font-mono bg-muted/20 p-2 rounded border-l-2 border-primary/20 overflow-hidden`}
				>
					{displayValue}
				</div>
			</div>
		</div>
	);
}
