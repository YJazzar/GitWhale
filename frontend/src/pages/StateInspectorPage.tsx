import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStateInspectorValues } from '@/hooks/state/use-state-inspector-values';
import { serialize } from '@/utils/serializer';
import {
	Bug,
	ChevronDown,
	ChevronRight,
	Copy,
	Database,
	Palette,
	Search,
	Sidebar,
	Terminal,
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

function formatGroupTitle(groupKey: string): string {
	return groupKey
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, (str) => str.toUpperCase())
		.replace(/Atoms$/, '')
		.trim();
}

function formatAtomLabel(atomKey: string): string {
	return atomKey
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, (str) => str.toUpperCase())
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
		const serializedState = serialize(allStateValues);
		navigator.clipboard.writeText(serializedState || 'Something went wrong with serialization');
	}, [allStateValues]);

	return (
		<div className="h-full flex flex-col bg-background">
			{/* Compact Toolbar */}
			<div className="bg-muted/10 px-3 py-2 shadow-xs">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<Bug className="w-4 h-4 text-primary" />
						<h1 className="font-medium text-sm">State Inspector</h1>
					</div>
					<div className="flex items-center gap-2">
						<div className="relative">
							<Search className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 transform -translate-y-1/2" />
							<Input
								placeholder="Search..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-6 pr-2 py-1 h-7 text-xs w-48"
							/>
						</div>
						<Button
							onClick={handleCopyAll}
							variant="outline"
							size="sm"
							className="h-7 px-2 text-xs"
							title="Copy all state to clipboard"
						>
							<Copy className="w-3 h-3" />
						</Button>
					</div>
				</div>
			</div>

			{/* Main Content - Limited to 2 columns max */}
			<div className="flex-1 overflow-auto p-2">
				{/* <ReactJson src={allStateValues} theme={'apathy:inverted'} /> */}
				<div className="columns-1 lg:columns-2 gap-4 space-y-2">
					{Object.entries(allStateValues).map(([groupKey, valuesGroup]) => (
						<StateSection
							key={groupKey}
							groupKey={groupKey}
							title={formatGroupTitle(groupKey)}
							icon={getGroupIcon(groupKey)}
							searchQuery={searchQuery}
							valuesGroup={valuesGroup}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

interface StateSectionProps {
	groupKey: string;
	title: string;
	icon: React.ReactNode;
	searchQuery: string;
	valuesGroup: Record<string, unknown>;
}

function StateSection({ groupKey, title, icon, searchQuery, valuesGroup }: StateSectionProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);

	// Filter section content based on search query
	const shouldShowSection = useMemo(() => {
		if (!searchQuery) return true;
		return (
			title.toLowerCase().includes(searchQuery.toLowerCase()) 
			|| Object.keys(valuesGroup).some((key) => key.toLowerCase().includes(searchQuery.toLowerCase()))
			|| serialize(valuesGroup).toLowerCase().includes(searchQuery.toLowerCase())
		);
	}, [title, searchQuery, valuesGroup]);

	if (!shouldShowSection) {
		return null;
	}

	const itemCount = Object.keys(valuesGroup).length;
	const dataCount = Object.values(valuesGroup).length;

	return (
		<div className="break-inside-avoid mb-2 border rounded bg-card/50 shadow-xs">
			<div
				className="px-3 py-2 cursor-pointer hover:bg-muted/40 flex items-center justify-between group transition-colors bg-muted/15"
				onClick={() => setIsCollapsed(!isCollapsed)}
			>
				<div className="flex items-center gap-2 min-w-0 flex-1">
					<div className="p-1 rounded text-primary shrink-0">{icon}</div>
					<div className="min-w-0 flex-1">
						<div className="font-semibold text-sm text-foreground truncate">{title}</div>
						<div className="text-xs text-muted-foreground/70 font-mono truncate">{groupKey}</div>
					</div>
				</div>
				<div className="flex items-center gap-1 shrink-0">
					<span className="text-xs text-muted-foreground">
						{dataCount}/{itemCount}
					</span>
					{isCollapsed ? (
						<ChevronRight className="w-3 h-3 text-muted-foreground" />
					) : (
						<ChevronDown className="w-3 h-3 text-muted-foreground" />
					)}
				</div>
			</div>
			{!isCollapsed && (
				<div className="p-1 space-y-1">
					{Object.entries(valuesGroup).map(([atomKey, value]) => (
						<StateDisplay
							key={atomKey}
							atomKey={atomKey}
							label={formatAtomLabel(atomKey)}
							value={value}
							searchQuery={searchQuery}
						/>
					))}
				</div>
			)}
		</div>
	);
}

interface StateDisplayProps {
	atomKey: string;
	label: string;
	value: unknown;
	searchQuery?: string;
}

function StateDisplay({ atomKey, label, value, searchQuery }: StateDisplayProps) {
	const displayValue = serialize(value);

	// Check if this item matches the search query
	const matchesSearch = useMemo(() => {
		if (!searchQuery) return true;
		const query = searchQuery.toLowerCase();
		return (
			label.toLowerCase().includes(query) ||
			atomKey.toLowerCase().includes(query) ||
			displayValue.toLowerCase().includes(query)
		);
	}, [label, atomKey, displayValue, searchQuery]);

	// Don't render if doesn't match search
	if (!matchesSearch) {
		return null;
	}

	// Get value color and type indicator (dark mode friendly)
	const getValueStyle = (val: unknown) => {
		if (val === null || val === undefined)
			return {
				color: 'text-muted-foreground/60',
				type: 'null',
				bg: 'bg-muted/20 dark:bg-muted/10',
				badgeColor: 'bg-muted text-muted-foreground',
			};
		if (typeof val === 'boolean')
			return {
				color: val ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
				type: 'bool',
				bg: val ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'bg-red-50/50 dark:bg-red-950/20',
				badgeColor: val
					? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
					: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
			};
		if (typeof val === 'number')
			return {
				color: 'text-blue-600 dark:text-blue-400',
				type: 'num',
				bg: 'bg-blue-50/50 dark:bg-blue-950/20',
				badgeColor: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
			};
		if (typeof val === 'string')
			return {
				color: 'text-purple-600 dark:text-purple-400',
				type: 'str',
				bg: 'bg-purple-50/50 dark:bg-purple-950/20',
				badgeColor: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
			};
		if (typeof val === 'object')
			return {
				color: 'text-orange-600 dark:text-orange-400',
				type: 'obj',
				bg: 'bg-orange-50/50 dark:bg-orange-950/20',
				badgeColor: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
			};
		return {
			color: 'text-foreground',
			type: '?',
			bg: 'bg-muted/20 dark:bg-muted/10',
			badgeColor: 'bg-muted text-muted-foreground',
		};
	};

	const style = getValueStyle(value);

	return (
		<div className={`rounded text-xs transition-colors bg-background hover:bg-muted/20`}>
			<div className="px-2 py-1">
				<div className="flex items-center justify-between gap-2 mb-1">
					<div className="flex items-center gap-1 flex-1">
						<span className="font-medium text-foreground truncate">{label}</span>
						<span className="text-muted-foreground/60 font-mono text-xs shrink-0">
							({atomKey})
						</span>
					</div>
					<div className="flex items-center gap-1 shrink-0">
						<span className={`text-xs px-1 py-0.5 rounded font-mono ${style.badgeColor}`}>
							{style.type}
						</span>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								try {
									const serialized = serialize(value);
									navigator.clipboard.writeText(serialized);
								} catch {
									// Fallback to string conversion
									navigator.clipboard.writeText(String(value));
								}
							}}
							className="h-4 w-4 p-0 hover:bg-muted"
							title="Copy value"
						>
							<Copy className="w-2.5 h-2.5" />
						</Button>
					</div>
				</div>
				<div
					className={`${style.color} font-mono text-xs p-1.5 rounded ${style.bg} whitespace-pre-wrap overflow-auto max-h-96`}
				>
					{displayValue}
				</div>
			</div>
		</div>
	);
}
