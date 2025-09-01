import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCopyToClipboard } from '@/hooks/utils/use-copy-to-clipboard';

interface CopyButtonProps {
	text: string;
	className?: string;
	size?: 'sm' | 'default' | 'lg';
	variant?: 'ghost' | 'outline' | 'default';
	title?: string;
	successTitle?: string;
	onCopy?: (text: string) => void;
	onError?: (error: Error) => void;
}

export function CopyButton({
	text,
	className,
	size = 'sm',
	variant = 'ghost',
	title = 'Copy to clipboard',
	successTitle = 'Copied to clipboard!',
	onCopy,
	onError,
}: CopyButtonProps) {
	const { copyToClipboard, copySuccess } = useCopyToClipboard();

	const handleCopy = async (e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			await copyToClipboard(text);
			onCopy?.(text);
		} catch (error) {
			onError?.(error as Error);
		}
	};

	return (
		<Button
			variant={variant}
			size={size}
			className={cn(
				'transition-colors duration-200',
				size === 'sm' && 'h-6 w-6 p-0',
				copySuccess
					? 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400'
					: 'hover:bg-muted-foreground/10',
				className
			)}
			onClick={handleCopy}
			title={copySuccess ? successTitle : title}
		>
			{copySuccess ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
			<span className="sr-only">{copySuccess ? successTitle : title}</span>
		</Button>
	);
}