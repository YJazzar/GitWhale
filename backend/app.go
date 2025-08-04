package backend

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/runletapp/go-console"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var APP_NAME = "GitWhale"

// App struct
type App struct {
	ctx                   context.Context
	IsLoading             bool          `json:"isLoading"`
	StartupState          *StartupState `json:"startupState"`
	AppConfig             *AppConfig    `json:"appConfig"`
	terminalSessions      map[string]*TerminalSession
	terminalSessionsMutex sync.RWMutex
	diffSessions          map[string]*DiffSession
}

type TerminalSession struct {
	consoleSession *console.Console
	waiter         sync.WaitGroup
	cancel         context.CancelFunc
}

// NewApp creates a new App application struct
func NewApp() *App {
	app := App{}
	app.IsLoading = true
	return &app
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (app *App) Startup(ctx context.Context, startupState *StartupState) {
	Log.setContext(ctx)

	app.ctx = ctx
	app.IsLoading = false

	appConfig, err := LoadAppConfig()
	if err != nil {
		Log.Error("An error occurred while reading the application's saved config: %v\n", err)
	}

	Log.Trace("Running App.Startup()")

	app.StartupState = startupState
	app.AppConfig = appConfig
	app.terminalSessions = make(map[string]*TerminalSession)
	app.diffSessions = make(map[string]*DiffSession)

	if startupState.DirectoryDiff != nil {
		if startupState.DirectoryDiff.ShouldStartFileWatcher {
			watcher, err := StartFileDiffWatcher(ctx)
			if err != nil {
				Log.Error("Failed to start file diff watcher: %v", err)
			} else {
				startupState.fileDiffWatcher = watcher
			}
		}
	}
}

// Saves the config file
func (app *App) Shutdown(ctx context.Context) {
	if app.StartupState.DirectoryDiff != nil {
		if app.StartupState.DirectoryDiff.ShouldStartFileWatcher {
			CloseFileDiffWatcher(app.StartupState.fileDiffWatcher)
		}
	}

	// if app.IsInDirDiffMode() {
	// 	return // no need to update config in this case
	// }

	err := app.AppConfig.SaveAppConfig()
	if err != nil {
		Log.Error("Failed to save application configuration: %v\n", err)
	}
}

func (a *App) GetAppState() *App {
	// Log.Debug("AppState: %v", PrettyPrint(a))
	return a
}

// func (app *App) IsInDirDiffMode() bool {
// 	if app.StartupState == nil || app.StartupState.DirectoryDiff == nil {
// 		return false
// 	}

// 	return true
// }

// Reads any arbitrary file and provides it to the web process
func (a *App) ReadFile(filePath string) string {
	if filePath == "" {
		return ""
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Sprintf("Error: %v\n", err)
	}

	return string(data)
}

// Launches a dialog to select a folder and opens a repo in the current window
func (app *App) OpenNewRepo() string {
	newRepoPath, err := runtime.OpenDirectoryDialog(app.ctx, runtime.OpenDialogOptions{})
	if err != nil || newRepoPath == "" {
		return ""
	}

	return app.AppConfig.openNewRepo(newRepoPath)
}

func (app *App) CloseRepo(gitRepoPath string) *App {
	app.AppConfig.closeRepo(gitRepoPath)
	app.CleanupTerminalSession(gitRepoPath)
	return app
}

func (app *App) InitNewTerminalSession(repoPath string) {
	SetupXTermForNewRepo(app, repoPath)
}

func (app *App) OnTerminalSessionWasResized(repoPath string, newSize TTYSize) {
	session, exists := app.terminalSessions[repoPath]
	if !exists {
		Log.Error("Tried to resize a non-existent session")
		return
	}

	ResizeConsoleSession(session, newSize)
}

func (app *App) CleanupTerminalSession(repoPath string) {
	DisposeXTermSession(app, repoPath)
}

func (app *App) RunGitLog(gitRepoPath string) []GitLogCommitInfo {
	commitsToLoad := app.AppConfig.Settings.Git.CommitsToLoad
	return readGitLog(gitRepoPath, commitsToLoad, "", false, "")
}

func (app *App) RunGitLogFromRef(gitRepoPath, ref string) []GitLogCommitInfo {
	commitsToLoad := app.AppConfig.Settings.Git.CommitsToLoad
	return readGitLog(gitRepoPath, commitsToLoad, ref, false, "")
}

func (app *App) RunGitLogWithOptions(gitRepoPath string, options GitLogOptions) []GitLogCommitInfo {
	return readGitLogWithOptions(gitRepoPath, options)
}

func (app *App) GetBranches(gitRepoPath string) []GitRef {
	return getBranches(gitRepoPath)
}

func (app *App) GetTags(gitRepoPath string) []GitRef {
	return getTags(gitRepoPath)
}

func (app *App) GitFetch(gitRepoPath, remote, ref string) error {
	return gitFetch(gitRepoPath, remote, ref)
}

func (app *App) SearchCommits(gitRepoPath, query string) []GitLogCommitInfo {
	commitsToLoad := app.AppConfig.Settings.Git.CommitsToLoad
	return readGitLog(gitRepoPath, commitsToLoad, "", false, query)
}

func (app *App) ToggleStarRepo(gitRepoPath string) bool {
	return app.AppConfig.toggleStarRepo(gitRepoPath)
}

func (app *App) UpdateSettings(newSettings AppSettings) error {
	return app.AppConfig.updateSettings(newSettings)
}

func (app *App) GetDefaultShellCommand() string {
	return strings.Join(getDefaultShellCommand(), " ")
}

// Diff session management methods

func (app *App) StartDiffSession(options DiffOptions) (*DiffSession, error) {
	Log.Info("Starting diff session for repo: %s", options.RepoPath)

	session, err := CreateDiffSession(options)
	if err != nil {
		return nil, err
	}

	// Store session in app
	app.diffSessions[session.SessionId] = session

	// Cleanup old sessions periodically
	go CleanupOldDiffSessions()

	return session, nil
}

func (app *App) GetDiffSession(sessionId string) *DiffSession {
	session, exists := app.diffSessions[sessionId]
	if !exists {
		return nil
	}

	// Update last accessed time
	session.LastAccessed = time.Now()
	return session
}

func (app *App) EndDiffSession(sessionId string) error {
	_, exists := app.diffSessions[sessionId]
	if !exists {
		return fmt.Errorf("diff session not found: %s", sessionId)
	}

	// Cleanup temp directories
	err := CleanupDiffSession(sessionId)
	if err != nil {
		Log.Error("Failed to cleanup diff session %s: %v", sessionId, err)
	}

	// Remove from app sessions
	delete(app.diffSessions, sessionId)

	Log.Info("Ended diff session: %s", sessionId)
	return nil
}

func (app *App) ListDiffSessions() []*DiffSession {
	sessions := make([]*DiffSession, 0, len(app.diffSessions))
	for _, session := range app.diffSessions {
		sessions = append(sessions, session)
	}
	return sessions
}

func (app *App) GetApplicationLogHistory() []LogEntry {
	entries := logBuffer.entries
	return entries
}

func (app *App) ClearApplicationLogHistory() {
	logBuffer.entries = make([]LogEntry, 0)
}
