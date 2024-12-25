package backend

type RepoContext struct {
	// The file path where the AppConfig struct lives
	CurrentBranch string `json:"currentBranch"`
}

// Called when a repo is first opened by the user
func CreateContext(repoPath string) *RepoContext {
	return &RepoContext{
		CurrentBranch: getCurrentBranchName(repoPath),
	}
}
