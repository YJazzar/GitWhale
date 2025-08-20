# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
GitWhale is a cross-platform Git diff viewer built with Wails (Go backend + React TypeScript frontend). It integrates with Git as a difftool to provide a rich visual interface for comparing files and directories.

## Development Commands
- **Development**: `wails dev` - runs the app in development mode with hot reload
- **Build**: `wails build` - creates a production build
- **Frontend only**: 
  - `cd frontend && yarn dev` - Vite development server
  - `cd frontend && yarn build` - TypeScript compilation + Vite build

## Architecture Overview

### Backend (Go)
- **Entry point**: `main.go` - Wails app initialization and startup logic
- **Core app logic**: `backend/app.go` - main App struct and startup/shutdown handlers
- **Git operations**: `backend/gitCommands.go` - Git log parsing and repository operations
- **Terminal integration**: `backend/xterm.go` - xterm.js session management for each repo
- **File diffing**: `backend/filediff.go` and `backend/dirdiff.go` - diff computation logic
- **State management**: `backend/startupState.go` - handles startup arguments and inter-process communication

### Frontend (React + TypeScript)
- **State management**: Uses Jotai for atomic state management (`hooks/state/`)
- **Routing**: React Router v7 with file-based routing structure in `pages/`
- **UI Components**: shadcn/ui components with Radix UI primitives and Tailwind CSS
- **Key pages**:
  - `RepoPage.tsx` - Main repository view with sidebar navigation
  - `RepoLogView.tsx` - Git log visualization
  - `RepoTerminalView.tsx` - Integrated terminal
  - `DirDiffPage.tsx` - Directory comparison view
- **Terminal**: Uses xterm.js for terminal emulation (`components/xterm-wrapper.tsx`)
- **Diff viewer**: Monaco Editor for file diff visualization

### State Management Pattern

#### Application-Level State (Persistent)
- **Central State**: All application-level data is maintained in the `AppConfig` struct (`backend/config.go`)
- **Persistence**: AppConfig is automatically saved to JSON file on app shutdown and loaded on startup
- **Access Pattern**: Frontend accesses this state via `UseAppState()` hook which syncs with Go backend
- **What Goes Here**: User settings, repository lists, preferences, and any data that should persist between sessions

#### State Management Guidelines
- **Default to AppConfig**: When adding new application-level features, store data in AppConfig struct where reasonable
- **Auto-generated Types**: Wails automatically generates TypeScript types from Go structs in `frontend/wailsjs/go/models.ts`
- **State Updates**: Use backend methods that update AppConfig and call `refreshAppState()` on frontend to sync
- **Example Pattern**:
  ```go
  // backend/config.go - Add to AppConfig struct
  type AppConfig struct {
      Settings AppSettings `json:"settings"`
      // ... other persistent data
  }
  
  // backend/app.go - Add method to update and save
  func (app *App) UpdateSomething(newData SomeType) error {
      app.AppConfig.SomeField = newData
      return app.AppConfig.SaveAppConfig()
  }
  ```
  ```typescript
  // frontend - Access via UseAppState hook
  const { appState, refreshAppState } = UseAppState();
  const someData = appState?.appConfig?.someField;
  
  // Update and refresh
  await UpdateSomething(newData);
  await refreshAppState();
  ```

#### Component-Level State (Ephemeral)
- **Individual repo state**: Managed via `use-repo-state.ts` for repository-specific data that doesn't need persistence
- **Terminal sessions**: Managed per repository path, disposed when repo is closed
- **UI state**: Use React state hooks or Jotai atoms for temporary UI state

### Key Integrations
- Git difftool integration via `.gitconfig` setup
- Inter-process communication for handling multiple instances
- File system watching for live updates
- Terminal emulation with proper PTY handling

## Frontend Architecture Patterns

### Jotai State Management

#### Session-Based State Architecture
GitWhale uses a sophisticated session-based state management pattern with Jotai atoms:

- **Map-Based Atoms**: All state atoms use `Map<SessionKey, StateData>` structure for multi-instance support
- **Session Key Generators**: Consistent naming patterns via helper functions (e.g., `SidebarSessionKeyGenerator.repoSidebar(repoPath)`)
- **Primitive Abstractions**: Custom hooks like `useMapPrimitive` and `useLoadTrackedMapPrimitive` provide clean interfaces to map-based atoms

#### State Atom Patterns
Every state module follows this pattern:
```typescript
// State atoms (private)
const someDataAtom = atom<Map<SessionKey, SomeData>>(new Map());

// Hook to use the state (public)
export function useSomeState(sessionKey: string) {
  const primitive = useMapPrimitive(someDataAtom, sessionKey);
  
  return {
    data: primitive.value,
    setData: primitive.set,
    cleanup: primitive.kill
  };
}

// Atoms accessor for state inspector (public)
export function useSomeStateAtoms() {
  return { someDataAtom };
}
```

#### State Inspector Integration
- **Automatic Discovery**: All state atoms are automatically collected via `useStateInspectorValues()` hook
- **Real-time Debugging**: The State Inspector page (`StateInspectorPage.tsx`) provides live view of all application state
- **Custom Serialization**: Uses a sophisticated serializer (`utils/serializer.ts`) that handles React components, Maps, Sets, and complex objects
- **Searchable Interface**: Full-text search across all state data with type-aware display

### Command Palette System

#### Context-Aware Architecture
The command palette uses a sophisticated context system:

- **Context Types**: Commands are scoped to specific contexts (Root, Repo, Settings, ApplicationLogs)
- **Dynamic Registration**: Commands can be registered/unregistered at runtime using `useCommandRegistry`
- **Context Data**: Rich context objects passed to commands (e.g., `RepoCommandPaletteContextData` includes `repoPath`)

#### Command Definition Pattern
```typescript
const exampleCommand: CommandDefinition<ReturnType<typeof useRequiredHooks>> = {
  id: 'unique.command.id',
  title: 'Display Name',
  icon: <IconComponent />,
  keywords: ['search', 'terms'],
  context: CommandPaletteContextKey.Repo,
  parameters: [
    {
      id: 'paramId',
      type: 'select',
      prompt: 'Choose option',
      options: (hooks) => [...] // Dynamic options based on current state
    }
  ],
  action: {
    type: 'function', // or 'terminalCommand'
    requestedHooks: () => useRequiredHooks(),
    runAction: async (hooks, parameters) => {
      // Command implementation
    }
  }
};
```

#### Command Features
- **Fuzzy Search**: Uses Fuse.js for intelligent command discovery
- **Parameter Validation**: Type-safe parameter handling with async validation
- **Terminal Integration**: Built-in support for executing shell commands with streaming output
- **Hook Dependency Injection**: Commands specify required hooks, automatically provided during execution

### Navigation & Tab Management

#### Tab-Based Navigation
GitWhale uses a sophisticated tab system for navigation:

- **Session Isolation**: Each tab maintains independent state via session keys
- **Tab Types**: Permanent tabs (repos, settings) vs temporary tabs (diffs, editors)
- **Dynamic Content**: Tabs can be created/destroyed dynamically based on user actions

#### Navigation Patterns
```typescript
// Navigation hook pattern
export function useNavigateRootFilTabs() {
  const fileTabs = useFileTabsHandlers(FileTabsSessionKeyGenerator.appWorkspace());
  
  const onOpenNewTab = (tabProps: TabProps) => {
    fileTabs.openTab(tabProps);
  };
  
  return { onOpenNewTab, ... };
}
```

#### Navigation Flow
1. **Root Level**: Main application workspace with global tabs (home, settings, repos)
2. **Repository Level**: Each repo gets its own tab with internal sidebar navigation
3. **Context Switching**: Command palette context changes based on active tab/view

### Repository Workspace Organization

#### Sidebar Architecture
Each repository workspace uses a modular sidebar system:

- **Static Items**: Always available (Home, Log, Terminal)
- **Dynamic Items**: Added/removed at runtime (commit diffs, search results)
- **Modes**: Compact (icon-only) and Wide (full labels) modes
- **Session Persistence**: Sidebar state persists per repository

#### Workspace Components
- **RepoPage.tsx**: Main container that sets up sidebar with static items
- **RepoHomeView.tsx**: Dashboard with quick actions, recent commits, worktrees
- **RepoLogView.tsx**: Git log visualization with D3.js graph
- **RepoTerminalView.tsx**: Integrated terminal with xterm.js

#### State Management Per Repo
Each repository maintains isolated state:
```typescript
export const useRepoState = (repoPath: string) => {
  const sidebar = useSidebarHandlers(SidebarSessionKeyGenerator.repoSidebar(repoPath));
  
  const stateObjects = {
    terminalState: getTerminalState(repoPath),
    homeState: getHomeState(repoPath),
    diffState: getDiffState(repoPath),
    logState: getLogState(repoPath),
  };
  
  const onCloseRepo = () => {
    // Cleanup all repo-specific state
    Object.values(stateObjects).forEach(state => state.dispose?.());
    sidebar.cleanup();
  };
  
  return { ...stateObjects, onCloseRepo };
};
```

### File Organization Patterns

#### Feature-Based Structure
```
frontend/src/
├── components/           # Reusable UI components
│   ├── command-palette/  # Command palette specific components
│   ├── git-log/         # Git log visualization components
│   ├── repo-home/       # Repository home page components
│   └── ui/              # Basic UI primitives (shadcn/ui)
├── hooks/               # Custom React hooks
│   ├── command-palette/ # Command system hooks
│   ├── navigation/      # Navigation and routing hooks
│   ├── state/          # State management hooks
│   │   ├── primitives/ # Reusable state primitives
│   │   └── repo/       # Repository-specific state
│   └── git-log/        # Git log specific hooks
├── pages/              # Top-level page components
│   └── repo/           # Repository-specific pages
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

#### Naming Conventions
- **State Hooks**: `use-[feature]-state.ts` (kebab-case)
- **Components**: `PascalCase.tsx`
- **Session Keys**: Generated via helper functions for consistency
- **State Atoms**: `[feature]Atom` (camelCase)

#### Hook Composition Pattern
Complex functionality is built from composable hooks:
```typescript
// Low-level primitive
const useMapPrimitive = (atom, key) => { ... }

// Mid-level feature hook  
const useSidebarState = (sessionKey) => {
  const primitive = useMapPrimitive(sidebarAtom, sessionKey);
  // Add sidebar-specific logic
}

// High-level handlers hook
const useSidebarHandlers = (sessionKey) => {
  const state = useSidebarState(sessionKey);
  // Add handlers and business logic
}
```

### Developer Tools

#### State Inspector
- **Live Debugging**: Real-time view of all Jotai atoms across the application
- **Search & Filter**: Find specific state values or atom names quickly
- **Value Serialization**: Custom serializer handles complex objects, React components
- **Copy to Clipboard**: Easy export of state data for debugging

#### Custom Serializer Features
- **React Component Handling**: Safely serializes React elements showing props and keys
- **Map/Set Support**: Proper formatting for ES6 collections
- **Indentation Control**: Configurable indentation for readable output
- **Type Indicators**: Visual type badges (str, num, bool, obj) for easy identification

### Integration Patterns

#### Backend Communication
- **Auto-Generated Types**: Wails generates TypeScript types from Go structs
- **State Synchronization**: `UseAppState()` hook syncs with Go backend
- **Method Calls**: Direct Go method invocation from TypeScript

#### Type Safety
- **Generic State Hooks**: Fully typed state management with TypeScript generics
- **Command Type Safety**: Commands specify hook dependencies with proper typing
- **Parameter Validation**: Type-safe parameter handling in command palette

## Build System
- Wails handles the Go-React bridge and bundling
- Frontend uses Vite for fast development and TypeScript compilation
- No separate testing framework currently configured