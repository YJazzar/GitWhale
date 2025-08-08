package backend

import "gitwhale/backend/git_operations"

type RepoContext struct {
	// The file path where the AppConfig struct lives
	CurrentBranchName string `json:"currentBranchName"`
}

// Called when a repo is first opened by the user
func CreateContext(repoPath string) *RepoContext {
	return &RepoContext{
		CurrentBranchName: git_operations.GetCurrentBranchName(repoPath),
	}
}
