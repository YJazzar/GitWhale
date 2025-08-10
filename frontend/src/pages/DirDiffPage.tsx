import { FileTree } from '@/components/dir-diff-viewer';
import { FileTabs, TabsManagerHandle } from '@/components/file-tabs';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { atom, useAtom } from 'jotai';
import { GitCompare } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { GetStartupDirDiffDirectory } from '../../wailsjs/go/backend/App';
import { git_operations } from '../../wailsjs/go/models';
import { EmptyState } from '@/components/empty-state';

const directoryDataAtom = atom<git_operations.Directory>();

export default function DirDiffPage() {
	const [directoryData, setDirectoryData] = useAtom(directoryDataAtom);
	const fileTabRef = useRef<TabsManagerHandle>(null);

	useEffect(() => {
		if (!!directoryData) {
			return;
		}

		GetStartupDirDiffDirectory().then((dirData) => {
			setDirectoryData(dirData);
		});
	}, []);

	if (!directoryData) {
		return (
			<EmptyState
				title={() => {
					return (
						<>
							<GitCompare className="w-5 h-5" />
							No Directory Diff Data
						</>
					);
				}}
				message="No directory diff data is available for display."
			/>
		);
	}

	return (
		<div className="w-full h-full flex flex-row min-h-0">
			<ResizablePanelGroup direction="horizontal">
				{/* Left pane that contains the file structure */}
				<ResizablePanel id="file-tree-panel" defaultSize={25} minSize={15}>
					<div className="border-r h-full overflow-y-auto overflow-x-hidden">
						<FileTree tabManagerHandler={fileTabRef} directoryData={directoryData} />
					</div>
				</ResizablePanel>

				<ResizableHandle withHandle />

				{/* Right pane containing the actual diffs */}
				<ResizablePanel id="diff-content-panel">
					<div className="grow h-full flex flex-col min-h-0">
						<FileTabs
							ref={fileTabRef}
							initialTabs={[]}
							fileTabManageSessionKey={'startup-diff-viewer'}
						/>
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
