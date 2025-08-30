import { CopyButton } from '@/components/ui/copy-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { useState, useMemo } from 'react';

interface CommandOutputDisplayProps {
	title: string;
	output: string;
	outputType: 'stdout' | 'stderr';
	className?: string;
}

const NullSpecialChar = '␀'

export function CommandOutputDisplay({ title, output, outputType, className }: CommandOutputDisplayProps) {
	const [showProcessed, setShowProcessed] = useState(true);

	const processedOutput = useMemo(() => {
		if (!showProcessed) return output;
		
		// Replace null terminators with newlines and add visual indicators
		return output.replace(/\0/g, `${NullSpecialChar}\n`);
	}, [output, showProcessed]);

	const hasNullTerminators = output.includes('\0');

	const baseStyles = outputType === 'stderr' 
		? 'border-red-200 dark:border-red-800' 
		: 'border-border';
	
	const contentStyles = outputType === 'stderr'
		? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
		: '';

	return (
		<div className={`flex flex-col flex-1 min-h-0 ${className || ''}`}>
			<div className="flex items-center justify-between mb-2 flex-shrink-0">
				<div className="flex items-center gap-2">
					<h4 className={`text-sm font-medium ${outputType === 'stderr' ? 'text-red-600 dark:text-red-400' : ''}`}>
						{title}
					</h4>
					{hasNullTerminators && (
						<Button
							variant="ghost"
							size="sm"
							className="h-5 px-1 text-xs"
							onClick={() => setShowProcessed(!showProcessed)}
							title={showProcessed ? 'Show raw output' : 'Process null terminators'}
						>
							{showProcessed ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
							{showProcessed ? 'Raw' : 'Process'}
						</Button>
					)}
				</div>
				<CopyButton text={output} title={`Copy ${outputType} output`} />
			</div>
			<div className={`flex-1 border rounded-md overflow-hidden min-h-0 ${baseStyles}`}>
				<ScrollArea className="h-full">
					<pre className={`text-xs p-4 whitespace-pre-wrap break-all ${contentStyles}`}>
						{showProcessed && hasNullTerminators ? (
							<ProcessedOutput text={processedOutput} />
						) : (
							output
						)}
					</pre>
				</ScrollArea>
			</div>
		</div>
	);
}

interface ProcessedOutputProps {
	text: string;
}

function ProcessedOutput({ text }: ProcessedOutputProps) {
	// Split text by the null terminator replacement pattern
	const parts = text.split(`${NullSpecialChar}\n`);
	
	return (
		<>
			{parts.map((part, index) => (
				<span key={index}>
					{part}
					{index < parts.length - 1 && (
						<>
							<span 
								className="text-blue-500 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-950/30 px-1 rounded text-xl" 
								title="Null terminator replaced with newline"
							>
								{NullSpecialChar}
							</span>
							{'\n'}
						</>
					)}
				</span>
			))}
		</>
	);
}