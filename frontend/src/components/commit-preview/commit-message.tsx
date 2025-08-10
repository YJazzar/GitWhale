import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { git_operations } from 'wailsjs/go/models';

interface CommitMessageProps {
	commit: git_operations.DetailedCommitInfo;
}

export function CommitMessage({ commit }: CommitMessageProps) {
	const commitMessage = Array.isArray(commit?.commitMessage)
		? commit.commitMessage.join('\n')
		: commit?.commitMessage;

	if (!commitMessage) return null;

	return (
		<>
			<Separator />
			<div className="space-y-2">
				<h4 className="text-sm font-medium text-muted-foreground">Commit Message</h4>
				<Card>
					<CardContent className="p-4">
						<pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
							{commitMessage}
						</pre>
					</CardContent>
				</Card>
			</div>
		</>
	);
}