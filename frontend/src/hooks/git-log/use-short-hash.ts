


export function useShortHash(commitHash: string | undefined) { 
	if (!commitHash) { 
		return undefined
	}

	if (commitHash.length < 28) { 
		return commitHash
	}


	return commitHash.slice(0, 7)
}