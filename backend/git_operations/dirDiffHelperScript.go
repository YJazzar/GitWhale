package git_operations

var HELPER_SCRIPT_TOOL_NAME = "gitwhale-diff-helper"

var UNIX_HELPER_SCRIPT_CONTENTS = `#!/bin/bash
set -e

# GitWhale Diff Script - Bash Version
echo "[DIFF-SCRIPT] Starting GitWhale diff script execution"
echo "[DIFF-SCRIPT] Script arguments: $*"
echo "[DIFF-SCRIPT] Left source: $1"
echo "[DIFF-SCRIPT] Right source: $2"
echo "[DIFF-SCRIPT] Environment check - GITWHALE_LEFT_DEST: $GITWHALE_LEFT_DEST"
echo "[DIFF-SCRIPT] Environment check - GITWHALE_RIGHT_DEST: $GITWHALE_RIGHT_DEST"

# Check if both parameters are provided
if [ -z "$1" ]; then
    echo "[DIFF-SCRIPT] ERROR: Git difftool did not provide left directory path"
    echo "ERROR: Git difftool did not provide left directory path"
    exit 1
fi
if [ -z "$2" ]; then
    echo "[DIFF-SCRIPT] ERROR: Git difftool did not provide right directory path"
    echo "ERROR: Git difftool did not provide right directory path"
    exit 1
fi

echo "[DIFF-SCRIPT] Parameters validated successfully"

# Check if directories exist
if [ ! -d "$1" ]; then
    echo "[DIFF-SCRIPT] ERROR: Left directory does not exist: $1"
    echo "ERROR: Left directory does not exist: $1"
    exit 1
fi
if [ ! -d "$2" ]; then
    echo "[DIFF-SCRIPT] ERROR: Right directory does not exist: $2"
    echo "ERROR: Right directory does not exist: $2"
    exit 1
fi

echo "[DIFF-SCRIPT] Source directories verified successfully"

# Check environment variables
if [ -z "$GITWHALE_LEFT_DEST" ]; then
    echo "[DIFF-SCRIPT] ERROR: GITWHALE_LEFT_DEST environment variable not set"
    echo "ERROR: GITWHALE_LEFT_DEST environment variable not set"
    exit 1
fi
if [ -z "$GITWHALE_RIGHT_DEST" ]; then
    echo "[DIFF-SCRIPT] ERROR: GITWHALE_RIGHT_DEST environment variable not set"
    echo "ERROR: GITWHALE_RIGHT_DEST environment variable not set"
    exit 1
fi

echo "[DIFF-SCRIPT] Environment variables validated successfully"

# Ensure destination directories exist
echo "[DIFF-SCRIPT] Creating destination directories if needed"
mkdir -p "$GITWHALE_LEFT_DEST"
mkdir -p "$GITWHALE_RIGHT_DEST"

# Copy directories recursively
echo "[DIFF-SCRIPT] Starting copy operation for left directory: $1 -> $GITWHALE_LEFT_DEST"
if ! cp -r "$1/." "$GITWHALE_LEFT_DEST/" 2>/dev/null; then
    echo "[DIFF-SCRIPT] ERROR: Failed to copy left directory"
    echo "ERROR: Failed to copy left directory"
    exit 1
fi

echo "[DIFF-SCRIPT] Left directory copied successfully"

echo "[DIFF-SCRIPT] Starting copy operation for right directory: $2 -> $GITWHALE_RIGHT_DEST"
if ! cp -r "$2/." "$GITWHALE_RIGHT_DEST/" 2>/dev/null; then
    echo "[DIFF-SCRIPT] ERROR: Failed to copy right directory"
    echo "ERROR: Failed to copy right directory"
    exit 1
fi

echo "[DIFF-SCRIPT] Right directory copied successfully"
echo "[DIFF-SCRIPT] All operations completed successfully"
echo "SUCCESS: Directories copied successfully"
exit 0`

var WINDOWS_HELPER_SCRIPT_CONTENTS = `@echo off
setlocal enabledelayedexpansion

REM GitWhale Diff Script - Windows Batch Version
echo [DIFF-SCRIPT] Starting GitWhale diff script execution
echo [DIFF-SCRIPT] Script arguments: %*
echo [DIFF-SCRIPT] Left source: %1
echo [DIFF-SCRIPT] Right source: %2
echo [DIFF-SCRIPT] Environment check - GITWHALE_LEFT_DEST: %GITWHALE_LEFT_DEST%
echo [DIFF-SCRIPT] Environment check - GITWHALE_RIGHT_DEST: %GITWHALE_RIGHT_DEST%

REM Check if both parameters are provided
if "%1"=="" (
    echo [DIFF-SCRIPT] ERROR: Git difftool did not provide left directory path
    echo ERROR: Git difftool did not provide left directory path
    exit /b 1
)
if "%2"=="" (
    echo [DIFF-SCRIPT] ERROR: Git difftool did not provide right directory path
    echo ERROR: Git difftool did not provide right directory path
    exit /b 1
)

echo [DIFF-SCRIPT] Parameters validated successfully

REM Check if directories exist
if not exist "%1" (
    echo [DIFF-SCRIPT] ERROR: Left directory does not exist: %1
    echo ERROR: Left directory does not exist: %1
    exit /b 1
)
if not exist "%2" (
    echo [DIFF-SCRIPT] ERROR: Right directory does not exist: %2
    echo ERROR: Right directory does not exist: %2
    exit /b 1
)

echo [DIFF-SCRIPT] Source directories verified successfully

REM Check environment variables
if "%GITWHALE_LEFT_DEST%"=="" (
    echo [DIFF-SCRIPT] ERROR: GITWHALE_LEFT_DEST environment variable not set
    echo ERROR: GITWHALE_LEFT_DEST environment variable not set
    exit /b 1
)
if "%GITWHALE_RIGHT_DEST%"=="" (
    echo [DIFF-SCRIPT] ERROR: GITWHALE_RIGHT_DEST environment variable not set
    echo ERROR: GITWHALE_RIGHT_DEST environment variable not set
    exit /b 1
)

echo [DIFF-SCRIPT] Environment variables validated successfully

REM Ensure destination directories exist
echo [DIFF-SCRIPT] Creating destination directories if needed
if not exist "%GITWHALE_LEFT_DEST%" mkdir "%GITWHALE_LEFT_DEST%"
if not exist "%GITWHALE_RIGHT_DEST%" mkdir "%GITWHALE_RIGHT_DEST%"

REM Copy directories using robocopy
echo [DIFF-SCRIPT] Starting copy operation for left directory: %1 -> %GITWHALE_LEFT_DEST%
robocopy "%1" "%GITWHALE_LEFT_DEST%" /E /NFL /NDL /NJH /NJS /NC /NS /NP > nul
set left_exitcode=%errorlevel%
echo [DIFF-SCRIPT] Robocopy left directory exit code: %left_exitcode%

if %left_exitcode% geq 8 (
    echo [DIFF-SCRIPT] ERROR: Failed to copy left directory, exit code: %left_exitcode%
    echo ERROR: Failed to copy left directory
    exit /b 1
)

echo [DIFF-SCRIPT] Left directory copied successfully

echo [DIFF-SCRIPT] Starting copy operation for right directory: %2 -> %GITWHALE_RIGHT_DEST%
robocopy "%2" "%GITWHALE_RIGHT_DEST%" /E /NFL /NDL /NJH /NJS /NC /NS /NP > nul
set right_exitcode=%errorlevel%
echo [DIFF-SCRIPT] Robocopy right directory exit code: %right_exitcode%

if %right_exitcode% geq 8 (
    echo [DIFF-SCRIPT] ERROR: Failed to copy right directory, exit code: %right_exitcode%
    echo ERROR: Failed to copy right directory
    exit /b 1
)

echo [DIFF-SCRIPT] Right directory copied successfully
echo [DIFF-SCRIPT] All operations completed successfully
echo SUCCESS: Directories copied successfully
exit /b 0`
