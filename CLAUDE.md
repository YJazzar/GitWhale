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
- Backend state exposed through Wails bindings
- Frontend uses `UseAppState()` hook to sync with Go backend state
- Individual repo state managed via `use-repo-state.ts`
- Terminal sessions managed per repository path

### Key Integrations
- Git difftool integration via `.gitconfig` setup
- Inter-process communication for handling multiple instances
- File system watching for live updates
- Terminal emulation with proper PTY handling

## Build System
- Wails handles the Go-React bridge and bundling
- Frontend uses Vite for fast development and TypeScript compilation
- No separate testing framework currently configured