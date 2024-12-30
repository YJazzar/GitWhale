package backend

type RepoContext struct {
	// The file path where the AppConfig struct lives
	CurrentBranchName string `json:"currentBranchName"`
}

// Represents a line in `git log`'s output
type GitLogCommitInfo struct {
	CommitHash         string   `json:"commitHash"`
	Username           string   `json:"username"`
	UserEmail          string   `json:"userEmail"`
	CommitTimeStamp    string   `json:"commitTimeStamp"`
	AuthoredTimeStamp  string   `json:"authoredTimeStamp"`
	ParentCommitHashes []string `json:"parentCommitHashes"`
	Refs               string   `json:"refs"`
	CommitMessage      []string `json:"commitMessage"`
	ShortStat          string   `json:"shortStat"`
}

// Called when a repo is first opened by the user
func CreateContext(repoPath string) *RepoContext {
	return &RepoContext{
		CurrentBranchName: getCurrentBranchName(repoPath),
	}
}
