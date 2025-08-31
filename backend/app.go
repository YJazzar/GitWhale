package backend

import (
	"context"
	"encoding/json"
	"fmt"
	"gitwhale/backend/command_utils"
	"gitwhale/backend/git_operations"
	"gitwhale/backend/lib"
	"gitwhale/backend/logger"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx             context.Context
	IsLoading       bool          `json:"isLoading"`
	StartupState    *StartupState `json:"startupState"`
	AppConfig       *AppConfig    `json:"appConfig"`
	terminalManager command_utils.XTermSessionManager
	diffSessions    map[string]*git_operations.DiffSession
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
	logger.Log.SetContext(ctx)
	command_utils.SetCommandBufferContext(ctx)

	app.ctx = ctx
	app.IsLoading = false

	appConfig, err := LoadAppConfig()
	if err != nil {
		logger.Log.Error("An error occurred while reading the application's saved config: %v\n", err)
	}

	logger.Log.Trace("Running App.Startup()")

	app.StartupState = startupState
	app.AppConfig = appConfig
	app.terminalManager = command_utils.XTermSessionManager{
		Ctx:              ctx,
		Settings:         &appConfig.Settings.Terminal,
		TerminalSessions: map[string]*command_utils.TerminalSession{},
	}
	app.diffSessions = make(map[string]*git_operations.DiffSession)

	if startupState.DirectoryDiffArgs != nil {
		if startupState.DirectoryDiffArgs.ShouldStartFileWatcher {
			watcher, err := StartFileDiffWatcher(ctx)
			if err != nil {
				logger.Log.Error("Failed to start file diff watcher: %v", err)
			} else {
				startupState.fileDiffWatcher = watcher
			}
		}
	} else {
		// Ensure git difftool is configured with helper script
		logger.Log.Debug("Ensuring git difftool configuration...")
		if err := git_operations.SetupGitDirDiffHelperScript(); err != nil {
			logger.Log.Error("Failed to configure git difftool: %v", err)
		}
		logger.Log.Debug("Git difftool configuration completed successfully")
	}

	// Set up frontend log event listener
	logger.SetupFrontEndLogger(ctx)
}

// Saves the config file
func (app *App) Shutdown(ctx context.Context) {
	if app.StartupState.DirectoryDiffArgs != nil {
		if app.StartupState.DirectoryDiffArgs.ShouldStartFileWatcher {
			CloseFileDiffWatcher(app.StartupState.fileDiffWatcher)
		}
	}

	err := app.AppConfig.SaveAppConfig()
	if err != nil {
		logger.Log.Error("Failed to save application configuration: %v\n", err)
	}
}

func (a *App) GetAppState() *App {
	return a
}

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

	return newRepoPath
}

// Actually opens the repo and adds it to the app's state
func (app *App) OpenRepoWithPath(gitRepoPath string) {
	app.AppConfig.openNewRepo(gitRepoPath)
}

func (app *App) CloseRepo(gitRepoPath string) *App {
	app.AppConfig.closeRepo(gitRepoPath)
	app.CleanupTerminalSession(gitRepoPath)
	return app
}

func (app *App) InitNewTerminalSession(repoPath string) {
	app.terminalManager.SetupXTermForNewRepo(repoPath)
}

func (app *App) OnTerminalSessionWasResized(repoPath string, newSize command_utils.TTYSize) {
	app.terminalManager.ResizeConsoleSession(repoPath, newSize)
}

func (app *App) CleanupTerminalSession(repoPath string) {
	app.terminalManager.DisposeXTermSession(repoPath)
}

func (app *App) RunGitLog(gitRepoPath string, options *git_operations.GitLogOptions) []git_operations.GitLogCommitInfo {

	if options == nil {
		options = &git_operations.GitLogOptions{}
	}

	if options.CommitsToLoad == nil || *options.CommitsToLoad == 0 {
		options.CommitsToLoad = &app.AppConfig.Settings.Git.CommitsToLoad
	}

	return git_operations.ReadGitLog(gitRepoPath, *options)
}

func (app *App) GetDetailedCommitInfo(repoPath string, commitHash string) (*git_operations.DetailedCommitInfo, error) {
	return git_operations.GetDetailedCommitInfo(repoPath, commitHash)
}

func (app *App) GetAllRefs(gitRepoPath string) []git_operations.GitRef {
	return git_operations.GetAllRefs(gitRepoPath)
}

func (app *App) GetWorktrees(gitRepoPath string) []git_operations.WorktreeInfo {
	return git_operations.GetWorktrees(gitRepoPath)
}

func (app *App) GitFetch(gitRepoPath string) error {
	return git_operations.GitFetch(gitRepoPath)
}

// ValidateRef checks if a Git reference is valid in the given repository
func (app *App) ValidateRef(gitRepoPath string, ref string) bool {
	return git_operations.ValidateGitRef(gitRepoPath, ref)
}

func (app *App) ToggleStarRepo(gitRepoPath string) bool {
	return app.AppConfig.toggleStarRepo(gitRepoPath)
}

func (app *App) UpdateSettings(newSettings AppSettings) error {
	err := app.AppConfig.updateSettings(newSettings)
	if err != nil {
		app.terminalManager.Settings = &newSettings.Terminal
	}

	return err
}

type TerminalDefaults struct {
	DefaultInteractiveTerminalCommand string `json:"defaultInteractiveTerminalCommand"`
	DefaultShellForBackgroundCommands string `json:"defaultShellForBackgroundCommands"`
}

func (app *App) GetTerminalDefaults() TerminalDefaults {
	return TerminalDefaults{
		DefaultInteractiveTerminalCommand: strings.Join(app.terminalManager.GetDefaultInteractiveTerminalCommand(), " "),
		DefaultShellForBackgroundCommands: strings.Join(app.terminalManager.GetDefaultShellForBackgroundCommands(), " "),
	}
}

// Diff session management methods

func (app *App) GetStartupDirDiffDirectory() *git_operations.Directory {
	if app == nil || app.StartupState == nil {
		return nil
	}

	diffArgs := app.StartupState.DirectoryDiffArgs
	if diffArgs == nil {
		logger.Log.Warning("Attempted to run a GetDiffSessionDirectory(), but was provided nil diffArgs")
		return nil
	}

	return git_operations.ReadDiffs(diffArgs.LeftPath, diffArgs.RightPath)
}

func (app *App) StartDiffSession(options git_operations.DiffOptions) (*git_operations.DiffSession, error) {
	logger.Log.Info("Starting diff session for repo: %s", options.RepoPath)

	session, err := git_operations.CreateDiffSession(options)
	if err != nil {
		return nil, err
	}

	if !session.HasDiffData {
		return session, nil
	}

	// Store session in app
	app.diffSessions[session.SessionId] = session

	// Cleanup old sessions periodically
	go git_operations.CleanupOldDiffSessions()

	return session, nil
}

func (app *App) GetDiffSession(sessionId string) *git_operations.DiffSession {
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
	err := git_operations.CleanupDiffSession(sessionId)
	if err != nil {
		logger.Log.Error("Failed to cleanup diff session %s: %v", sessionId, err)
	}

	// Remove from app sessions
	delete(app.diffSessions, sessionId)

	logger.Log.Info("Ended diff session: %s", sessionId)
	return nil
}

func (app *App) ListDiffSessions() []*git_operations.DiffSession {
	sessions := make([]*git_operations.DiffSession, 0, len(app.diffSessions))
	for _, session := range app.diffSessions {
		sessions = append(sessions, session)
	}
	return sessions
}

func (app *App) GetApplicationLogHistory() []logger.LogEntry {
	return logger.Log.GetCachedLogEntries()
}

func (app *App) ClearApplicationLogHistory() {
	logger.Log.ClearLogEntries()
}

// Command logging API methods
func (app *App) GetCommandLogs() []command_utils.CommandEntry {
	return command_utils.GetCachedCommandEntries()
}

func (app *App) ClearCommandLogs() {
	command_utils.ClearCommandEntries()
}

func (app *App) GetCommandById(commandId string) *command_utils.CommandEntry {
	return command_utils.GetCommandById(commandId)
}

// Returns the "topic" the user can subscribe to and send messages to
func (app *App) ExecuteShellCommand(command string, workingDir, broadcastToTopic string) {
	// app.AppConfig.Settings.Terminal.
	shellPathCommand := app.terminalManager.GetDefaultShellForBackgroundCommands()
	command_utils.StartRunningAndStreamCommand(app.ctx, shellPathCommand, command, workingDir, broadcastToTopic)
}

// Custom Commands CRUD operations

func (app *App) SaveCustomCommand(command UserDefinedCommandDefinition) error {
	// Check if command with this ID already exists
	existingIndex := -1
	for i, existingCommand := range app.AppConfig.Settings.CustomCommands {
		if existingCommand.ID == command.ID {
			existingIndex = i
			break
		}
	}

	if existingIndex >= 0 {
		// Update existing command
		app.AppConfig.Settings.CustomCommands[existingIndex] = command
	} else {
		// Add new command
		app.AppConfig.Settings.CustomCommands = append(app.AppConfig.Settings.CustomCommands, command)
	}

	return app.AppConfig.SaveAppConfig()
}

func (app *App) DeleteCustomCommand(commandId string) error {
	// Find and remove the command
	for i, command := range app.AppConfig.Settings.CustomCommands {
		if command.ID == commandId {
			app.AppConfig.Settings.CustomCommands = append(
				app.AppConfig.Settings.CustomCommands[:i],
				app.AppConfig.Settings.CustomCommands[i+1:]...,
			)
			return app.AppConfig.SaveAppConfig()
		}
	}
	return fmt.Errorf("custom command with ID %s not found", commandId)
}

// User Script Import/Export operations

// UserScriptExportData represents the structure for exporting user scripts
type UserScriptExportData struct {
	Version     string                         `json:"version"`
	ExportDate  string                         `json:"exportDate"`
	UserScripts []UserDefinedCommandDefinition `json:"userScripts"`
}

// ExportUserScripts opens a file dialog for saving user scripts export file,
// then serializes all custom user scripts to JSON and saves to a file
func (app *App) ExportUserScripts() error {
	today := time.Now()
	defaultName := fmt.Sprintf("gitwhale-user-scripts-%s.json", today.Format("2006-01-02"))

	filePath, err := runtime.SaveFileDialog(app.ctx, runtime.SaveDialogOptions{
		Title:           "Export User Scripts",
		DefaultFilename: defaultName,
		Filters: []runtime.FileFilter{
			{
				DisplayName: "JSON Files",
				Pattern:     "*.json",
			},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to open save dialog: %w", err)
	}
	if filePath != "" {
		return nil
	}

	exportData := UserScriptExportData{
		Version:     "1.0",
		ExportDate:  time.Now().Format(time.RFC3339),
		UserScripts: app.AppConfig.Settings.CustomCommands,
	}

	return lib.SaveAsJSON(filePath, exportData)
}

// ValidateUserScriptsFile validates the structure of a user scripts import file and returns the parsed data
func (app *App) ValidateUserScriptsFile(filePath string) (*UserScriptExportData, error) {
	if !lib.FileExists(filePath) {
		return nil, fmt.Errorf("file not found at: %s", filePath)
	}

	fileData, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	var exportData UserScriptExportData
	err = json.Unmarshal(fileData, &exportData)
	if err != nil {
		return nil, fmt.Errorf("invalid JSON format: %w", err)
	}

	// Validate required fields
	if exportData.Version == "" {
		return nil, fmt.Errorf("missing required field: version")
	}

	if exportData.UserScripts == nil {
		return nil, fmt.Errorf("missing required field: userScripts")
	}

	// Validate each user script structure
	for i, userScript := range exportData.UserScripts {
		if userScript.ID == "" {
			return nil, fmt.Errorf("user script %d is missing required field: id", i+1)
		}
		if userScript.Title == "" {
			return nil, fmt.Errorf("user script %d is missing required field: title", i+1)
		}
		if userScript.Context == "" {
			return nil, fmt.Errorf("user script %d is missing required field: context", i+1)
		}
		if userScript.Action.CommandString == "" {
			return nil, fmt.Errorf("user script %d is missing required field: action.commandString", i+1)
		}
	}

	return &exportData, nil
}

// SelectUserScriptFileForImport opens a file dialog for selecting user scripts import file
func (app *App) SelectUserScriptFileForImport() (string, error) {
	filePath, err := runtime.OpenFileDialog(app.ctx, runtime.OpenDialogOptions{
		Title: "Select User Scripts File",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "JSON Files",
				Pattern:     "*.json",
			},
		},
	})
	if err != nil {
		return "", fmt.Errorf("failed to open file dialog: %w", err)
	}
	return filePath, nil
}

// ImportCustomUserScripts imports selected user scripts from a validated file
func (app *App) ImportCustomUserScripts(filePath string, selectedUserScriptIds []string) error {
	exportData, err := app.ValidateUserScriptsFile(filePath)
	if err != nil {
		return fmt.Errorf("file validation failed: %w", err)
	}

	if len(selectedUserScriptIds) == 0 {
		return fmt.Errorf("no user scripts selected for import")
	}

	// Create a map for quick lookup of selected IDs
	selectedIds := make(map[string]bool)
	for _, id := range selectedUserScriptIds {
		selectedIds[id] = true
	}

	// Import selected user scripts with new IDs to avoid conflicts
	for _, userScript := range exportData.UserScripts {
		if selectedIds[userScript.ID] {
			// Generate new UUID to avoid ID conflicts
			newUserScript := userScript
			newUserScript.ID = uuid.New().String()

			// Add the user script
			app.AppConfig.Settings.CustomCommands = append(app.AppConfig.Settings.CustomCommands, newUserScript)
		}
	}

	return app.AppConfig.SaveAppConfig()
}

// Git staging operations

// GetGitStatus retrieves the current Git status for a repository
func (app *App) GetGitStatus(repoPath string) (*git_operations.GitStatus, error) {
	return git_operations.GetGitStatus(repoPath)
}

// StageFile stages a specific file
func (app *App) StageFile(repoPath, filePath string) error {
	return git_operations.StageFile(repoPath, filePath)
}

// UnstageFile unstages a specific file
func (app *App) UnstageFile(repoPath, filePath string) error {
	return git_operations.UnstageFile(repoPath, filePath)
}

// StageAllFiles stages all unstaged and untracked files
func (app *App) StageAllFiles(repoPath string) error {
	return git_operations.StageAllFiles(repoPath)
}

// UnstageAllFiles unstages all staged files
func (app *App) UnstageAllFiles(repoPath string) error {
	return git_operations.UnstageAllFiles(repoPath)
}

// CommitChanges commits the staged changes with the provided message
func (app *App) CommitChanges(repoPath, message string) error {
	return git_operations.CommitChanges(repoPath, message)
}

// CreateStagingDiffSession creates a staging diff session for viewing file diffs
func (app *App) CreateStagingDiffSession(repoPath, filePath, fileType string) (*git_operations.StagingDiffInfo, error) {
	return git_operations.CreateStagingDiffSession(repoPath, filePath, fileType)
}

// CleanupStagingDiffSession cleans up a staging diff session
func (app *App) CleanupStagingDiffSession(sessionId string) error {
	return git_operations.CleanupStagingDiffSession(sessionId)
}
