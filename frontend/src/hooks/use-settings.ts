import { DEFAULT_SETTINGS } from '@/types/settings';
import { UseAppState } from './state/use-app-state';
import { UpdateSettings } from '../../wailsjs/go/backend/App';
import { backend } from '../../wailsjs/go/models';

export function useSettings() {
	const { appState, refreshAppState } = UseAppState();

	// Get settings from app state, fallback to defaults
	const settings =
		appState?.appConfig?.settings ||
		new backend.AppSettings({
			git: new backend.GitSettings(DEFAULT_SETTINGS.git),
			terminal: new backend.TerminalSettings(DEFAULT_SETTINGS.terminal),
		});
	const isLoading = !appState;

	const updateSettings = async (newSettings: Partial<backend.AppSettings>) => {
		const updatedSettings = new backend.AppSettings({
			git: newSettings.git
				? new backend.GitSettings({ ...settings.git, ...newSettings.git })
				: settings.git,
			terminal: newSettings.terminal
				? new backend.TerminalSettings({ ...settings.terminal, ...newSettings.terminal })
				: settings.terminal,
		});

		// Save to backend and refresh app state
		try {
			await UpdateSettings(updatedSettings);
			await refreshAppState();
		} catch (error) {
			console.error('Failed to save settings to backend:', error);
		}
	};

	const resetSettings = async () => {
		const defaultSettings = new backend.AppSettings({
			git: new backend.GitSettings(DEFAULT_SETTINGS.git),
			terminal: new backend.TerminalSettings(DEFAULT_SETTINGS.terminal),
		});
		try {
			await UpdateSettings(defaultSettings);
			await refreshAppState();
		} catch (error) {
			console.error('Failed to reset settings in backend:', error);
		}
	};

	return {
		settings,
		isLoading,
		updateSettings,
		resetSettings,
	};
}
