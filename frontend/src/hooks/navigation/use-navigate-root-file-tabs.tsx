import RepoFileTab from '@/components/file-tabs/repo-file-tab';
import { FileTabsSessionKeyGenerator, TabProps, useFileTabsHandlers } from '@/hooks/state/useFileTabsHandlers';
import ApplicationLogsPage from '@/pages/ApplicationLogsPage';
import CommandLogsPage from '@/pages/CommandLogsPage';
import RepoPage from '@/pages/repo/RepoPage';
import SettingsPage from '@/pages/SettingsPage';
import StateInspectorPage from '@/pages/StateInspectorPage';
import UserScriptCommandEditor from '@/pages/UserScriptCommandEditor';
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
			tooltipContent: () => <span>{repoPath}</span>,
			component: <RepoPage repoPath={repoPath} />,
			isPermanentlyOpen: true,
			onTabClose: () => { },
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

	// Callback to open state inspector tab
	const onOpenStateInspector = () => {
		fileTabs.openTab({
			tabKey: '$$state-inspector$$',
			titleRender: () => <>State Inspector</>,
			component: <StateInspectorPage />,
			isPermanentlyOpen: true,
		});
	};

	// Callback to open command logs tab
	const onOpenCommandLogs = () => {
		fileTabs.openTab({
			tabKey: '$$command-logs$$',
			titleRender: () => <>Command Logs</>,
			component: <CommandLogsPage />,
			isPermanentlyOpen: true,
		});
	};

	const onOpenHomePage = () => {
		fileTabs.switchToTab('$$home$$');
	};

	// Callback to open user script command editor tab
	const onOpenUserScriptCommandEditor = (commandId?: string) => {
		const tabKey = commandId ? `$$custom-command-editor-${commandId}$$` : '$$custom-command-editor-new$$';

		let title = 'New Command';
		if (commandId) {
			// Try to get the command title from app state
			const userScriptCommands = appState.appState?.appConfig?.settings?.userScriptCommands || [];
			const command = userScriptCommands.find((cmd) => cmd.id === commandId);
			title = command?.title ? command.title : `Edit Command`;
		}

		const sessionId = crypto.randomUUID();

		fileTabs.openTab({
			tabKey,
			titleRender: () => <>{title}</>,
			tooltipContent: () => <>{title}</>,
			component: <UserScriptCommandEditor sessionKey={sessionId} originalCommandId={commandId} />,
			isPermanentlyOpen: true,
		});
	};

	const onCloseUserScriptCommandEditor = (commandId?: string) => {
		const tabKey = commandId ? `$$custom-command-editor-${commandId}$$` : '$$custom-command-editor-new$$';
		fileTabs.closeTab(tabKey);
	};

	return {
		onOpenHomePage,
		onOpenNewRepo,
		onOpenRepoWithPath,
		onOpenSettings,
		onOpenApplicationLogs,
		onOpenStateInspector,
		onOpenCommandLogs,
		onOpenUserScriptCommandEditor,
		onCloseUserScriptCommandEditor,
	};
}