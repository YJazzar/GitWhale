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
			<div className="space-y-2">
				<Card>
					<CardContent className="p-2">
						<pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
							{commitMessage}
						</pre>
					</CardContent>
				</Card>
			</div>
		</>
	);
}