import { useCommandPaletteStateAtoms } from "../command-palette/use-command-palette-state";
import { useGitDiffStateAtoms } from "./repo/use-git-diff-state";
import { useGitHomeStateAtoms } from "./repo/use-git-home-state";
import { useGitLogStateAtoms } from "./repo/use-git-log-state";
import { useAppLogStateAtoms } from "./use-app-log-state";
import { useAppStateAtoms } from "./use-app-state";
import { useCustomCommandStateAtoms } from "./use-custom-commands-state";
import { useFileTabsStateAtoms } from "./useFileTabsState";
import { useSidebarStateAtoms } from "./useSidebarState";

// Hook to get all application state values for debugging
export function useStateInspectorValues() {
	const appStateAtoms = useAppStateAtoms()
	const applicationLogsStateAtoms = useAppLogStateAtoms()
	const commandPaletteStateAtoms = useCommandPaletteStateAtoms()
	const commandRegistryStateAtoms = useCustomCommandStateAtoms()
	const customCommandStateAtoms = useCustomCommandStateAtoms()
	const fileTabsStateAtoms = useFileTabsStateAtoms()
	const sidebarStateAtoms = useSidebarStateAtoms()
	const gitDiffStateAtoms = useGitDiffStateAtoms()
	const gitHomeStateAtoms = useGitHomeStateAtoms()
	const gitLogStateAtoms = useGitLogStateAtoms()


	return {
		
	};
}
