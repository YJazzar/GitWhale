import { FileTabsSessionKeyGenerator, TabProps } from '@/hooks/state/useFileTabsHandlers';
import { useFileTabsHandlers } from '@/hooks/state/useFileTabsHandlers';
import RepoFileTab from '@/components/repo-file-tab';
import ApplicationLogsPage from '@/pages/ApplicationLogsPage';
import RepoPage from '@/pages/repo/RepoPage';
import SettingsPage from '@/pages/SettingsPage';
import CustomCommandEditor from '@/pages/CustomCommandEditor';
import { useCallback } from 'react';
import { OpenNewRepo, OpenRepoWithPath } from '../../../wailsjs/go/backend/App';
import { UseAppState } from '../state/use-app-state';

export function useNavigateRootFilTabs() {
	const appState = UseAppState();
	const fileTabs = useFileTabsHandlers(FileTabsSessionKeyGenerator.appWorkspace());

	// Callback to open a new repository tab
	const onOpenNewRepo = useCallback(async () => {
		const newRepoPath = await OpenNewRepo();
		onOpenRepoWithPath(newRepoPath);
	}, []);

	const onOpenRepoWithPath = async (repoPath: string) => {
		if (!repoPath || repoPath === '') {
			return;
		}

		await OpenRepoWithPath(repoPath);
		await appState.refreshAppState();

		const newRepoTab: TabProps = {
			tabKey: repoPath,
			titleRender: () => <RepoFileTab repoPath={repoPath} />,
			component: <RepoPage repoPath={repoPath} />,
			isPermanentlyOpen: true,
			onTabClose: () => {},
		};

		fileTabs.openTab(newRepoTab);
	};

	// Callback to open settings tab
	const onOpenSettings = () => {
		fileTabs.openTab({
			tabKey: '$$setting$$',
			titleRender: () => <>Settings</>,
			component: <SettingsPage />,
			isPermanentlyOpen: true,
		});
	};

	// Callback to open application logs tab
	const onOpenApplicationLogs = () => {
		fileTabs.openTab({
			tabKey: '$$logs$$',
			titleRender: () => <>Application Logs</>,
			component: <ApplicationLogsPage />,
			isPermanentlyOpen: true,
		});
	};

	const onOpenHomePage = () => {
		fileTabs.switchToTab('$$home$$');
	};

	// Callback to open custom command editor tab
	const onOpenCustomCommandEditor = (commandId?: string) => {
		const tabKey = commandId ? `$$custom-command-editor-${commandId}$$` : '$$custom-command-editor-new$$';
		const title = commandId ? 'Edit Command' : 'New Command';
		
		fileTabs.openTab({
			tabKey,
			titleRender: () => <>{title}</>,
			component: <CustomCommandEditor commandId={commandId} />,
			isPermanentlyOpen: true,
		});
	};

	return { onOpenHomePage, onOpenNewRepo, onOpenRepoWithPath, onOpenSettings, onOpenApplicationLogs, onOpenCustomCommandEditor };
}
