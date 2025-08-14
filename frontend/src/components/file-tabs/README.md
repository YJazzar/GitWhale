# File Tabs Context System

The file-tabs component now exposes its functionality through a React context, similar to how the sidebar context works. This allows any child component within the context provider to open, close, and manage tabs without needing direct access to the FileTabs ref.

## Quick Start

### 1. Wrap your component tree with FileTabsContextProvider

```tsx
import { FileTabs, FileTabsContextProvider, TabsManagerHandle } from '@/components/file-tabs';
import { useRef } from 'react';

function MyPage() {
	const fileTabsRef = useRef<TabsManagerHandle>(null);

	return (
		<FileTabsContextProvider fileTabsRef={fileTabsRef}>
			<div>
				<FileTabs ref={fileTabsRef} fileTabManageSessionKey="my-session" initialTabs={[]} />
				<MyChildComponent />
			</div>
		</FileTabsContextProvider>
	);
}
```

### 2. Use the hook in any child component

```tsx
import { useFileTabs } from '@/components/file-tabs';

function MyChildComponent() {
	const fileTabs = useFileTabs();

	const handleOpenFile = () => {
		fileTabs.openTab({
			tabKey: 'unique-file-key',
			titleRender: () => <>My File</>,
			component: <div>File content here</div>,
			isPermanentlyOpen: false,
			preventUserClose: false,
		});
	};

	return <button onClick={handleOpenFile}>Open File</button>;
}
```

## API Reference

### FileTabsContextProvider

Props:

-   `children: ReactNode` - The component tree that needs access to file tabs
-   `fileTabsRef: React.RefObject<TabsManagerHandle>` - Ref to the FileTabs component

### useFileTabs() Hook

Returns an object with these methods:

#### `openTab(tabToOpen: TabProps)`

Open a new tab or switch to an existing tab with the same key.

#### `closeTab(tabToClose: TabProps)`

Close the specified tab.

#### `getActiveTab(): TabProps | undefined`

Get the currently active tab, if any.

#### `getTabProps(tabKey: string): TabProps | undefined`

Get tab properties by tab key.

#### `setTabPermaOpen(tab: TabProps)`

Make a tab permanently open (prevents auto-closing).

## TabProps Interface

```tsx
interface TabProps {
	tabKey: string; // Unique identifier for the tab
	titleRender: () => React.ReactElement; // Function that returns the tab title
	component: React.ReactElement; // The content to display in the tab
	isPermanentlyOpen?: boolean; // Whether the tab stays open permanently
	preventUserClose?: boolean; // Whether the user can close this tab
	onTabClose?: () => void; // Callback when tab is closed
}
```

## Examples

### Opening a File Diff Tab

```tsx
function FileListItem({ filePath }: { filePath: string }) {
	const fileTabs = useFileTabs();

	const openFileDiff = () => {
		fileTabs.openTab({
			tabKey: `file-diff-${filePath}`,
			titleRender: () => <>{filePath.split('/').pop()}</>,
			component: <FileDiffViewer filePath={filePath} />,
			isPermanentlyOpen: false,
			preventUserClose: false,
		});
	};

	return (
		<div onClick={openFileDiff} className="cursor-pointer">
			{filePath}
		</div>
	);
}
```

### Managing Tabs Programmatically

```tsx
function TabControls() {
	const fileTabs = useFileTabs();

	const closeCurrentTab = () => {
		const activeTab = fileTabs.getActiveTab();
		if (activeTab && !activeTab.preventUserClose) {
			fileTabs.closeTab(activeTab);
		}
	};

	const makeCurrentTabPermanent = () => {
		const activeTab = fileTabs.getActiveTab();
		if (activeTab) {
			fileTabs.setTabPermaOpen(activeTab);
		}
	};

	return (
		<div>
			<button onClick={closeCurrentTab}>Close Current Tab</button>
			<button onClick={makeCurrentTabPermanent}>Make Tab Permanent</button>
		</div>
	);
}
```

## Migration Guide

### Before (using refs)

```tsx
// Parent component had to pass refs down
function Parent() {
	const fileTabRef = useRef<TabsManagerHandle>(null);

	return (
		<div>
			<FileTabs ref={fileTabRef} />
			<Child fileTabsRef={fileTabRef} />
		</div>
	);
}

// Child components needed the ref passed as props
function Child({ fileTabsRef }) {
	const openTab = () => {
		fileTabsRef.current?.openTab(/* ... */);
	};
}
```

### After (using context)

```tsx
// Parent provides context
function Parent() {
	const fileTabRef = useRef<TabsManagerHandle>(null);

	return (
		<FileTabsContextProvider fileTabsRef={fileTabRef}>
			<FileTabs ref={fileTabRef} />
			<Child />
		</FileTabsContextProvider>
	);
}

// Child components use the hook directly
function Child() {
	const fileTabs = useFileTabs();

	const openTab = () => {
		fileTabs.openTab(/* ... */);
	};
}
```

## Implementation Status

✅ **Completed Files:**

-   `use-file-tabs-context.tsx` - Context provider and low-level hook
-   `use-file-tabs.tsx` - High-level convenience hook
-   `index.tsx` - Clean exports
-   `example-usage.tsx` - Usage examples

✅ **Updated Files:**

-   `RepoCommitDiffView.tsx` - Now uses FileTabsContextProvider
-   `DirDiffPage.tsx` - Now uses FileTabsContextProvider

The file-tabs context system is now ready for use throughout the application!
