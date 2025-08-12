import { useDebounce } from '@uidotdev/usehooks';
import { ValidateRef } from '../../../wailsjs/go/backend/App';
import { useState, useEffect, useCallback } from 'react';
import { useRepoState } from '../state/repo/use-repo-state';

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

export interface UseValidateRefResult {
	validationState: ValidationState;
	isValid: boolean | null;

	// true if the passed in ref was not validated because it partially matches one of the known refs in the repo
	didSkipValidation: boolean
}

/**
 * Hook to validate Git references with debounced validation
 */
export function useValidateRef(repoPath: string, refToValidate: string): UseValidateRefResult {
	const { logState } = useRepoState(repoPath);
	const [validationState, setValidationState] = useState<ValidationState>('idle');
	const debouncedRefToValidate = useDebounce(refToValidate, 200);

	useEffect(() => {
		const validateAsync = async (refToCheck: string) => {
			refToCheck = refToCheck.toLowerCase()

			// Don't validate empty refs
			if (!refToCheck || refToCheck.trim() === '') {
				setValidationState('idle');
				return;
			}

			setValidationState('validating');

			// Check if the ref matches any of the ones we already know
			const isMatchingKnownRef = logState.refs?.some(ref => ref.name.toLowerCase().includes(debouncedRefToValidate))
			if (isMatchingKnownRef) { 
				setValidationState('idle');
				return 
			}

			try {
				const isValid = await ValidateRef(repoPath, debouncedRefToValidate.trim());
				setValidationState(isValid ? 'valid' : 'invalid');
			} catch (error) {
				console.warn('Failed to validate ref:', error);
				setValidationState('invalid');
			}
		};

		validateAsync(debouncedRefToValidate);
	}, [debouncedRefToValidate]);


	const isValid = validationState === 'valid' ? true : validationState === 'invalid' ? false : null;

	return {
		validationState,
		isValid,
		didSkipValidation: validationState === 'idle'
	};
}
