// Main components
export { FileTabs } from './file-tabs';
export type { TabsManagerHandle } from './file-tabs';

// Context and hooks
export { FileTabsContextProvider, useFileTabsContext } from './use-file-tabs-context';
export { useFileTabs } from './use-file-tabs';

// Re-export types from the hook
export type { TabProps, FileTabManagerProps } from '@/hooks/state/use-file-manager-state';