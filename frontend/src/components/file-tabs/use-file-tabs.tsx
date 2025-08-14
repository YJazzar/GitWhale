import { useFileTabsContext } from './use-file-tabs-context';
import { TabProps } from '@/hooks/state/use-file-manager-state';

/**
 * Convenience hook that provides a clean API for working with file tabs.
 * This hook can be used anywhere within a FileTabsContextProvider to
 * open, close, and manage tabs without needing direct access to the FileTabs ref.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const fileTabs = useFileTabs();
 *
 *   const handleOpenFile = () => {
 *     fileTabs.openTab({
 *       tabKey: 'unique-key',
 *       titleRender: () => 'My File',
 *       component: <MyFileComponent />,
 *     });
 *   };
 *
 *   return <button onClick={handleOpenFile}>Open File</button>;
 * }
 * ```
 */
export function useFileTabs() {
	const context = useFileTabsContext();

	return {
		/**
		 * Open a new tab or switch to an existing tab with the same key
		 */
		openTab: (tabToOpen: TabProps) => context.openTab(tabToOpen),

		/**
		 * Close the specified tab
		 */
		closeTab: (tabToClose: TabProps) => context.closeTab(tabToClose),

		/**
		 * Get the currently active tab, if any
		 */
		getActiveTab: () => context.getActiveTab(),

		/**
		 * Get tab properties by tab key
		 */
		getTabProps: (tabKey: string) => context.getTabProps(tabKey),

		/**
		 * Make a tab permanently open (prevents auto-closing)
		 */
		setTabPermaOpen: (tab: TabProps) => context.setTabPermaOpen(tab),
	};
}
