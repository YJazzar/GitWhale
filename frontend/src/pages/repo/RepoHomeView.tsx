import { Button } from "@/components/ui/button";
import { OpenNewRepo, RunGitLog } from "../../../wailsjs/go/backend/App";
import { useState } from "react";
import { useParams } from "react-router";
import { backend } from "wailsjs/go/models";


export default function RepoHomeView() {
	const { encodedRepoPath } = useParams();
	const [logs, setLogs] = useState<backend.GitLogCommitInfo[]>([]);

	if (!encodedRepoPath) {
		return <>Error: why are we rendering RepoHomeView when there's no repo provided?</>;
	}

	const repoPath = atob(encodedRepoPath);

	const refreshLogs = async () => {
		console.debug("refreshing logs on ", repoPath)
		const newLogs = await RunGitLog(repoPath);
		console.debug("got: ", newLogs)
		setLogs(newLogs)
	};

	return (
		<>
			<Button onClick={refreshLogs}>Refresh </Button>
			Log results:
			{logs.map((log) => {
				return (
					<div key={log.commitHash}>
						<code className="whitespace-pre-wrap">{JSON.stringify(log, null, 3)}</code>
					</div>
				);
			})}
		</>
	);
}
