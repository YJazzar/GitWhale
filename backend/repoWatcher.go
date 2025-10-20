package backend

import (
	"context"
	"path/filepath"
	"sync"
	"time"

	"gitwhale/backend/logger"

	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type repoFileSystemEvent struct {
	RepoPath  string `json:"repoPath"`
	Target    string `json:"target"`
	EventOp   string `json:"eventOp"`
	Timestamp int64  `json:"timestamp"`
}

type repoWatcher struct {
	repoPath string
	watcher  *fsnotify.Watcher
	cancel   context.CancelFunc
	mu       sync.Mutex
	lastEmit time.Time
}

func (app *App) ensureRepoWatcher(repoPath string) error {
	if repoPath == "" {
		return nil
	}

	if app.repoWatchers == nil {
		app.repoWatchers = make(map[string]*repoWatcher)
	}

	if _, exists := app.repoWatchers[repoPath]; exists {
		return nil
	}

	ctx, cancel := context.WithCancel(app.ctx)
	fsWatcher, err := fsnotify.NewWatcher()
	if err != nil {
		cancel()
		return err
	}

	w := &repoWatcher{
		repoPath: repoPath,
		watcher:  fsWatcher,
		cancel:   cancel,
		lastEmit: time.Now(),
	}

	targets := []string{
		repoPath,
		filepath.Join(repoPath, ".git"),
		filepath.Join(repoPath, ".git", "refs"),
		filepath.Join(repoPath, ".git", "logs"),
	}

	for _, target := range targets {
		if err := fsWatcher.Add(target); err != nil {
			logger.Log.Warning("Failed adding watcher target %s: %v", target, err)
		}
	}

	go w.run(ctx, app)

	app.repoWatchers[repoPath] = w
	return nil
}

func (w *repoWatcher) run(ctx context.Context, app *App) {
	defer func() {
		_ = w.watcher.Close()
	}()

	for {
		select {
		case event, ok := <-w.watcher.Events:
			if !ok {
				return
			}

			// Debounce to avoid spamming frontend
			w.mu.Lock()
			now := time.Now()
			if now.Sub(w.lastEmit) < 200*time.Millisecond {
				w.mu.Unlock()
				continue
			}
			w.lastEmit = now
			w.mu.Unlock()

			logger.Log.Debug("Repo watcher event %s: %v", w.repoPath, event)
			payload := repoFileSystemEvent{
				RepoPath:  w.repoPath,
				Target:    event.Name,
				EventOp:   event.Op.String(),
				Timestamp: now.UnixMilli(),
			}
			runtime.EventsEmit(ctx, "repo:fsupdate", payload)
		case err, ok := <-w.watcher.Errors:
			if !ok {
				return
			}
			logger.Log.Warning("Repo watcher error for %s: %v", w.repoPath, err)
		case <-ctx.Done():
			return
		}
	}
}

func (app *App) stopRepoWatcher(repoPath string) {
	if app.repoWatchers == nil {
		return
	}

	if watcher, exists := app.repoWatchers[repoPath]; exists {
		watcher.cancel()
		delete(app.repoWatchers, repoPath)
	}
}

func (app *App) disposeAllRepoWatchers() {
	for repoPath := range app.repoWatchers {
		app.stopRepoWatcher(repoPath)
	}
}
