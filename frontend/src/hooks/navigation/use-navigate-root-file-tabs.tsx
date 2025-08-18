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

		let title = 'New Command';
		if (commandId) {
			// Try to get the command title from app state
			const customCommands = appState.appState?.appConfig?.settings?.customCommands || [];
			const command = customCommands.find((cmd) => cmd.id === commandId);
			title = command?.title ? command.title : `Edit Command`;
		}

		fileTabs.openTab({
			tabKey,
			titleRender: () => <>{title}</>,
			component: <CustomCommandEditor originalCommandId={commandId} />,
			isPermanentlyOpen: true,
		});
	};

	const onCloseCustomCommandEditor = (commandId?: string) => {
		const tabKey = commandId ? `$$custom-command-editor-${commandId}$$` : '$$custom-command-editor-new$$';
		fileTabs.closeTab(tabKey);
	};

	return {
		onOpenHomePage,
		onOpenNewRepo,
		onOpenRepoWithPath,
		onOpenSettings,
		onOpenApplicationLogs,
		onOpenCustomCommandEditor,
		onCloseCustomCommandEditor,
	};
}
