import { useSettings } from '@/hooks/app-settings/use-settings';
import {
	GitSettings,
	TerminalSettings,
	AppearanceSettings,
	ApplicationInfo,
	CustomCommands,
	SettingsHeader,
	SettingsLoading
} from '@/components/settings';

export default function SettingsPage() {
	const { isLoading } = useSettings();

	if (isLoading) {
		return <SettingsLoading />;
	}

	return (
		<div className="container mx-auto p-4 max-w-4xl">
			<SettingsHeader />

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<GitSettings />
				<TerminalSettings />
				<AppearanceSettings />
				<div className="lg:col-span-2">
					<CustomCommands />
				</div>
				<ApplicationInfo />
			</div>
		</div>
	);
}
