package backend

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/fsnotify/fsnotify"
)

func SendFileDiffNotification(leftFilePath string, rightFilePath string) {
	lockFolderPath, err := getFileDiffNotificationsFolderPath()
	if err != nil {
		log.Fatal("Could not get the folder path to the notification folder:")
		log.Fatal(err)
		return
	}

	fileContent := fmt.Sprintf("%v\n%v", leftFilePath, rightFilePath)
	fileName := fmt.Sprintf("%v.tmp", HashString(fileContent))
	filePath := filepath.Join(lockFolderPath, fileName)

	err = WriteToFileAndReplaceOld(filePath, fileContent)
	if err != nil {
		Log.Fatal("Could not write to the file: %v", filePath)
		Log.Fatal("The following error occurred: %v", err)
	}
}

// Starts a watcher to the temporary file where we can get notifications for what new files to diff
func StartFileDiffWatcher(ctx context.Context) {
	lockFolderPath, err := getFileDiffNotificationsFolderPath()
	if err != nil {
		log.Fatal(err)
	}

	// Create new watcher.
	watcher, err := fsnotify.NewWatcher()
	defer func() {
		watcher.Close()
		deleteFileDiffWatcherLockFile()
	}()
	if err != nil {
		log.Fatal(err)
		return
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
				if event.Has(fsnotify.Write) {
					log.Println("modified file:", event.Name)
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

	// Block main goroutine forever.
	<-make(chan struct{})
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
