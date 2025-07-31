# Global State Management with Jotai

This directory contains the global state management solution for GitWhale using [Jotai](https://jotai.org/). This system prevents data loss during navigation by preserving component state in a global store.

## Problem Solved

Previously, when using React Router to navigate between pages, all component states were lost:
- GitLogGraph would lose loaded commits
- Selected commits would be cleared
- Panel sizes would reset
- Terminal sessions would disconnect
- Theme settings would reset

## Solution

A comprehensive global state management system using Jotai atoms that:
- Persists state across navigation
- Caches expensive computations
- Provides type-safe state access
- Enables state sharing between components
- Maintains performance through selective re-renders

## Architecture

### Core Files

- **`index.ts`** - Defines all Jotai atoms for different state domains
- **`hooks.ts`** - Provides React hooks for convenient state access
- **`provider.tsx`** - Wraps the app with Jotai Provider

### State Domains

#### 1. App State
```typescript
// Global app configuration and status
const appState = useAppState();
```

#### 2. Repository State
```typescript
// Per-repository data (commits, selections, loading states) - context-aware
const { commits, selectedCommit, setCommits, makeActive } = useRepoState(repoPath);
```

#### 3. File Tabs State
```typescript
// Open file tabs and active tab tracking
const { fileTabs, openFile, closeFile } = useFileTabs();
```

#### 4. UI State
```typescript
// Theme, sidebar state, panel sizes - context-aware
const { theme, setTheme } = useTheme();
const { sizes, saveSizes } = usePanelSizes('repo-log-view', [60, 40]);
```

#### 5. Terminal State
```typescript
// Terminal sessions and their status - context-aware
const { sessions, addSession, removeSession } = useTerminalSessions(repoPath);
```

#### 6. Git State
```typescript
// Commit graph cache and file diffs - context-aware
const { getCachedGraph, setCachedGraph } = useCommitGraphCache(repoPath);
const { fileDiff, setFileDiff, clearFileDiff } = useFileDiff(fileIdentifier);
```

## Usage Examples

### Repository Data
```typescript
import { useCurrentRepo } from '@/store/hooks';

export function MyComponent() {
  const { 
    commits, 
    selectedCommit, 
    loading,
    setCommits,
    setSelectedCommit,
    setLoading 
  } = useCurrentRepo();

  const refreshData = async () => {
    setLoading(true);
    const newCommits = await fetchCommits();
    setCommits(newCommits);
    setLoading(false);
  };

  // State persists across navigation!
  return (
    <div>
      {commits.map(commit => (
        <div key={commit.hash} onClick={() => setSelectedCommit(commit)}>
          {commit.message}
        </div>
      ))}
    </div>
  );
}
```

### Panel Sizes (with localStorage persistence)
```typescript
import { usePanelSizes } from '@/store/hooks';

export function ResizablePanel() {
  const { getPanelSizes, savePanelSizes } = usePanelSizes();
  
  const sizes = getPanelSizes('my-panel', [50, 50]); // default sizes
  
  const handleResize = (newSizes: number[]) => {
    savePanelSizes('my-panel', newSizes); // persisted to localStorage
  };

  return (
    <ResizablePanelGroup onLayout={handleResize}>
      <ResizablePanel defaultSize={sizes[0]}>Panel 1</ResizablePanel>
      <ResizablePanel defaultSize={sizes[1]}>Panel 2</ResizablePanel>
    </ResizablePanelGroup>
  );
}
```

### Caching Expensive Operations
```typescript
import { useCommitGraphCache } from '@/store/hooks';

export function useCommitGraph(commits, repoPath) {
  const { getCachedGraph, setCachedGraph } = useCommitGraphCache();
  
  return useMemo(() => {
    const cacheKey = `${repoPath}-${commits.map(c => c.hash).join(',')}`;
    
    const cached = getCachedGraph(cacheKey);
    if (cached) return cached;
    
    const result = buildExpensiveGraph(commits);
    setCachedGraph(cacheKey, result);
    return result;
  }, [commits, repoPath, getCachedGraph, setCachedGraph]);
}
```

## Migration Guide

### From useState to Global State

**Before:**
```typescript
export function MyComponent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  // State lost on navigation!
}
```

**After:**
```typescript
import { useCurrentRepo } from '@/store/hooks';

export function MyComponent() {
  const { commits: data, loading, setCommits: setData, setLoading } = useCurrentRepo();
  // State persists across navigation!
}
```

### From localStorage to Global State

**Before:**
```typescript
const [theme, setTheme] = useState(() => 
  localStorage.getItem('theme') || 'dark'
);

useEffect(() => {
  localStorage.setItem('theme', theme);
}, [theme]);
```

**After:**
```typescript
import { useTheme } from '@/store/hooks';

const { theme, setTheme } = useTheme();
// Automatically persisted with atomWithStorage
```

## Benefits

### 1. **State Persistence**
- No more lost data when navigating
- Seamless user experience
- Preserved user interactions

### 2. **Performance**
- Cached expensive computations
- Reduced API calls
- Selective component re-renders

### 3. **Developer Experience**
- Type-safe state access
- Consistent API patterns
- Easy debugging with Jotai DevTools

### 4. **Maintainability**
- Centralized state management
- Clear separation of concerns
- Reusable state logic

## Best Practices

### 1. Use Specific Hooks
```typescript
// ✅ Good - specific to domain
const { commits } = useCurrentRepo();

// ❌ Avoid - too generic
const state = useAtom(globalStateAtom);
```

### 2. Leverage Caching
```typescript
// ✅ Good - cache expensive operations
const graph = useCommitGraphCache();

// ❌ Avoid - recalculating every time
const graph = useMemo(() => buildGraph(commits), [commits]);
```

### 3. Use Computed Atoms
```typescript
// ✅ Good - derived state
const currentRepoDataAtom = atom(get => {
  const path = get(currentRepoPathAtom);
  const map = get(repoDataMapAtom);
  return map.get(path);
});
```

### 4. Persist Important State
```typescript
// ✅ Good - important user data persisted
const themeAtom = atomWithStorage('theme', 'dark');
const panelSizesAtom = atomWithStorage('panel-sizes', {});
```

## Testing

The state management system is testable using Jotai's testing utilities:

```typescript
import { createStore } from 'jotai';
import { Provider } from 'jotai';

const store = createStore();

function TestWrapper({ children }) {
  return <Provider store={store}>{children}</Provider>;
}

// Test components with isolated state
```

## Debugging

Use Jotai DevTools for debugging:

```typescript
import { DevTools } from 'jotai-devtools';

<Provider>
  <DevTools />
  <App />
</Provider>
```

## Future Enhancements

1. **State Synchronization** - Sync state across multiple windows
2. **Undo/Redo** - History management for user actions
3. **Offline Support** - Cache state for offline usage
4. **State Serialization** - Export/import state for debugging
