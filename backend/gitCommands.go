package backend

import (
	"os/exec"
	"strings"
)

func getCurrentBranchName(repoPath string) string {
	cmd := exec.Command("bash", "-c", "git rev-parse --abbrev-ref HEAD")
	cmd.Dir = repoPath
	return strings.TrimSpace(runCommandAndLogErr(cmd))
}

func readGitLog(repoPath string) []GitLogCommitInfo {
	Log.Info("Running git log on repo: %v", repoPath)

	gitLogCmdString := "git log --format=%H%n%aN%n%aE%n%at%n%ct%n%P%n%D%n%B -z --shortstat --diff-merges=first-parent -n50 --skip=0 --topo-order --decorate=full --stdin"
	cmd := exec.Command("bash", "-c", gitLogCmdString)
	cmd.Dir = repoPath

	cmdOutput := runCommandAndLogErr(cmd)

	outputLines := strings.Split(cmdOutput, "\n")
	Log.Debug("Lines split up: %v", outputLines)
	// Will contain all the parsed data
	parsedLogs := []GitLogCommitInfo{}

	currentLog := GitLogCommitInfo{}
	currentSubLineCount := -1
	onShortStatLine := false
	for _, line := range outputLines {
		Log.Debug("Parsing line: %v", line)
		currentSubLineCount += 1

		// The null terminators comes right before the short-stat line
		// (because of the -z flag)
		if line == "\x00" {
			onShortStatLine = true
			continue
		}

		if onShortStatLine {
			currentLog.ShortStat = line

			currentSubLineCount = -1
			onShortStatLine = false
			parsedLogs = append(parsedLogs, currentLog)
			currentLog = GitLogCommitInfo{}
			continue
		}

		switch currentSubLineCount {
		case 0:
			currentLog.CommitHash = line
		case 1:
			currentLog.Username = line
		case 2:
			currentLog.UserEmail = line
		case 3:
			currentLog.AuthoredTimeStamp = line
		case 4:
			currentLog.CommitTimeStamp = line
		case 5:
			currentLog.ParentCommitHashes = strings.Split(line, " ")
		case 6:
			currentLog.Refs = line
		case 7:
			currentLog.CommitMessage = []string{line}
		default:
			currentLog.CommitMessage = append(currentLog.CommitMessage, line)
		}

	}

	Log.Info("Parsed logs: %v", PrettyPrint(parsedLogs))

	return parsedLogs
}

func runCommandAndLogErr(command *exec.Cmd) string {
	result, err := command.Output()
	if err != nil {
		Log.Error("Error running command: [%v] -> %v\n", command.Args, err)
	}

	return string(result)
}
