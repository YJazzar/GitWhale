


export function useShortHash(commitHash: string | undefined, smartShortening: boolean = false) { 
	if (!commitHash) { 
		return undefined
	}

	if (commitHash.length < 28 && smartShortening) { 
		return commitHash
	}


	return commitHash.slice(0, 7)
}