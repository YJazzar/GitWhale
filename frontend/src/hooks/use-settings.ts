import { DEFAULT_SETTINGS } from '@/types/settings';
import { UpdateSettings } from '../../wailsjs/go/backend/App';
import { backend, command_utils, git_operations } from '../../wailsjs/go/models';
import { Logger } from '../utils/logger';
import { UseAppState } from './state/use-app-state';

export function useSettings() {
	const { appState, refreshAppState } = UseAppState();

	// Get settings from app state, fallback to defaults
	const settings =
		appState?.appConfig?.settings ||
		new backend.AppSettings({
			git: new backend.GitSettings(DEFAULT_SETTINGS.git),
			terminal: new command_utils.TerminalSettings(DEFAULT_SETTINGS.terminal),
			ui: new backend.UISettings(DEFAULT_SETTINGS.ui),
		});
	const isLoading = !appState;

	const updateSettings = async (newSettings: Partial<backend.AppSettings>) => {
		const updatedSettings = new backend.AppSettings({
			git: newSettings.git
				? new backend.GitSettings({ ...settings.git, ...newSettings.git })
				: settings.git,
			terminal: newSettings.terminal
				? new command_utils.TerminalSettings({ ...settings.terminal, ...newSettings.terminal })
				: settings.terminal,
			ui: newSettings.ui
				? new backend.UISettings({ ...settings.ui, ...newSettings.ui })
				: settings.ui,
		});

		// Save to backend and refresh app state
		try {
			await UpdateSettings(updatedSettings);
			await refreshAppState();
		} catch (error) {
			Logger.error(`Failed to save settings to backend: ${error}`, 'use-settings');
		}
	};

	const resetSettings = async () => {
		const defaultSettings = new backend.AppSettings({
			git: new backend.GitSettings(DEFAULT_SETTINGS.git),
			terminal: new command_utils.TerminalSettings(DEFAULT_SETTINGS.terminal),
			ui: new backend.UISettings(DEFAULT_SETTINGS.ui),
		});
		try {
			await UpdateSettings(defaultSettings);
			await refreshAppState();
		} catch (error) {
			Logger.error(`Failed to reset settings in backend: ${error}`, 'use-settings');
		}
	};

	return {
		settings,
		isLoading,
		updateSettings,
		resetSettings,
	};
}
