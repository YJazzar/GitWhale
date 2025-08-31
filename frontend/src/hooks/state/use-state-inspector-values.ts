import { useAtomValue } from 'jotai';
import { useCommandPaletteStateAtoms } from '../command-palette/use-command-palette-state';
import { useGitDiffStateAtoms } from './repo/use-git-diff-state';
import { useGitHomeStateAtoms } from './repo/use-git-home-state';
import { useGitLogStateAtoms } from './repo/use-git-log-state';
import { useGitStagingStateAtoms } from './repo/use-git-staging-state';
import { useAppLogStateAtoms } from './use-app-log-state';
import { useAppStateAtoms } from './use-app-state';
import { useUserScriptCommandStateAtoms } from './use-user-script-commands-state';
import { useFileTabsStateAtoms } from './useFileTabsState';
import { useSidebarStateAtoms } from './useSidebarState';
import { useMemo } from 'react';
import { useCommandRegistryStateAtoms } from '../command-palette/use-command-registry';

// Hook to get all application state values for debugging
export function useStateInspectorValues() {
	const appStateAtoms = useAppStateAtoms();
	const applicationLogsStateAtoms = useAppLogStateAtoms();
	const commandPaletteStateAtoms = useCommandPaletteStateAtoms();
	const commandRegistryStateAtoms = useCommandRegistryStateAtoms();
	const userScriptCommandStateAtoms = useUserScriptCommandStateAtoms();
	const fileTabsStateAtoms = useFileTabsStateAtoms();
	const sidebarStateAtoms = useSidebarStateAtoms();
	const gitDiffStateAtoms = useGitDiffStateAtoms();
	const gitHomeStateAtoms = useGitHomeStateAtoms();
	const gitLogStateAtoms = useGitLogStateAtoms();
	const gitStagingStateAtoms = useGitStagingStateAtoms();

	const allStateAtoms = {
		appStateAtoms,
		applicationLogsStateAtoms,
		commandPaletteStateAtoms,
		commandRegistryStateAtoms,
		userScriptCommandStateAtoms,
		fileTabsStateAtoms,
		sidebarStateAtoms,
		gitDiffStateAtoms,
		gitHomeStateAtoms,
		gitLogStateAtoms,
		gitStagingStateAtoms,
	};

	const allStateValues = Object.keys(allStateAtoms).reduce((acc, key) => {
		const atomsGroup = allStateAtoms[key as keyof typeof allStateAtoms];
		const valuesGroup = Object.keys(atomsGroup).reduce((groupAcc, atomKey) => {
			// eslint-disable-next-line react-hooks/react-compiler
			groupAcc[atomKey] = useAtomValue(atomsGroup[atomKey as keyof typeof atomsGroup]);
			return groupAcc;
		}, {} as Record<string, unknown>);
		acc[key] = valuesGroup;
		return acc;
	}, {} as Record<string, Record<string, unknown>>);

	return useMemo(() => {
		return allStateValues
	}, [allStateValues]);
}
