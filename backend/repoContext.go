package backend

type RepoContext struct {
	// The file path where the AppConfig struct lives
	CurrentBranch string `json:"currentBranch"`
}

func CreateContext(repoPath string) *RepoContext {
	return &RepoContext{
		CurrentBranch: getCurrentBranchName(repoPath),
	}
}
