package backend

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const NotificationFilePrefix = "FileDiff_"

func SendFileDiffNotification(leftFilePath string, rightFilePath string) {
	lockFolderPath, err := getFileDiffNotificationsFolderPath()
	if err != nil {
		Log.Fatal("Could not get the folder path to the notification folder:")
		Log.Fatal("%v", err)
		return
	}

	// normalize path
	leftFilePath, err = filepath.Abs(leftFilePath)
	if err != nil {
		Log.Fatal("Could not get the Absolute file path to the file: %v", leftFilePath)
		Log.Fatal("%v", err)
		return
	}

	// normalize path
	rightFilePath, err = filepath.Abs(rightFilePath)
	if err != nil {
		Log.Fatal("Could not get the Absolute file path to the file: %v", rightFilePath)
		Log.Fatal("%v", err)
		return
	}

	fileContent := fmt.Sprintf("%v\n%v", leftFilePath, rightFilePath)
	fileName := fmt.Sprintf("%v%v.tmp", NotificationFilePrefix, HashString(fileContent))
	filePath := filepath.Join(lockFolderPath, fileName)

	err = WriteToFileAndReplaceOld(filePath, fileContent)
	if err != nil {
		Log.Fatal("Could not write to the file: %v", filePath)
		Log.Fatal("The following error occurred: %v", err)
	}
}

// Starts a watcher to the temporary file where we can get notifications for what new files to diff
func StartFileDiffWatcher(ctx context.Context) *fsnotify.Watcher {
	lockFolderPath, err := getFileDiffNotificationsFolderPath()
	if err != nil {
		log.Fatal(err)
	}

	// Create new watcher.
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Fatal(err)
		return nil
	}

	createFileDiffWatcherLockFile()

	// Start listening for events.
	go func() {
		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				log.Println("event:", event)
				if event.Has(fsnotify.Create) || event.Has(fsnotify.Write) {
					onReceivedFileDiffNotification(ctx, event.Name)
				}
			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				log.Println("error:", err)
			}
		}
	}()

	// Add a path.
	err = watcher.Add(lockFolderPath)
	if err != nil {
		log.Fatal(err)
	}

	return watcher
}

func CloseFileDiffWatcher(watcher *fsnotify.Watcher) {
	if watcher != nil {
		watcher.Close()
	}

	deleteFileDiffWatcherLockFile()
}

type FileDiffNotification struct {
	LeftFilePath  string `json:"leftFilePath"`
	RightFilePath string `json:"rightFilePath"`
}

func onReceivedFileDiffNotification(ctx context.Context, notificationFilePath string) {
	Log.Info("Found new file diff at path: %v", notificationFilePath)

	dir, filename := filepath.Split(notificationFilePath)
	Log.Debug("\t- dir: %v", dir)
	Log.Debug("\t- filename: %v", filename)
	if !strings.HasPrefix(filename, NotificationFilePrefix) {
		Log.Info("Ignoring file due to incorrect prefix: %v", notificationFilePath)
		return
	}

	fileContent, err := ReadFileAsString(notificationFilePath)
	if err != nil {
		Log.Error("Error while getting file diff notification data: %v", err)
		return
	}

	lines := strings.Split(fileContent, "\n")
	if len(lines) != 2 {
		Log.Error("Received a notification, but the notification file was malformed (expected two lines inside it)")
		return
	}

	leftPath := lines[0]
	rightPath := lines[1]

	leftDirAbsPath, err := filepath.Abs(leftPath)
	if err != nil {
		Log.Error("Could not get the absolute path for: %v", leftPath)
		return
	}

	rightDirAbsPath, err := filepath.Abs(rightPath)
	if err != nil {
		Log.Error("Could not get the absolute path for: %v", rightPath)
		return
	}

	newFileNode := FileInfo{
		Path:            "",
		Name:            filepath.Base(leftPath),
		Extension:       removeLeadingPeriod(filepath.Ext(leftPath)),
		LeftDirAbsPath:  leftDirAbsPath,
		RightDirAbsPath: rightDirAbsPath,
	}

	Log.Info("Opening new diff: %v", PrettyPrint(newFileNode))
	runtime.EventsEmit(ctx, "onOpenNewFileDiff", newFileNode)
}

func createFileDiffWatcherLockFile() error {
	lockFilePath, err := getFileDiffNotificationLockFilePath()
	if err != nil {
		Log.Error("Could not get the file lock (at '%v') path due to err: %v", lockFilePath, err)
		return nil
	}

	return WriteToFileAndReplaceOld(lockFilePath, fmt.Sprintf("%v", os.Getpid()))
}

func deleteFileDiffWatcherLockFile() error {
	lockFilePath, err := getFileDiffNotificationLockFilePath()
	if err != nil {
		Log.Error("Could not get the file lock (at '%v') path due to err: %v", lockFilePath, err)
		return err
	}

	return DeleteFile(lockFilePath)
}
