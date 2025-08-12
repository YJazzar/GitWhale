import { useDebounce } from '@uidotdev/usehooks';
import { ValidateRef } from '../../../wailsjs/go/backend/App';
import { useState, useEffect, useCallback } from 'react';
import { useRepoState } from '../state/repo/use-repo-state';
import { Logger } from '../../utils/logger';

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

export interface UseValidateRefResult {
	validationState: ValidationState;
	isValid: boolean | null;

	// true if the passed in ref was not validated because it partially matches one of the known refs in the repo
	didSkipValidation: boolean;
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
			Logger.info(`Starting validation process for: ${refToCheck}`, 'useValidateRef');

			refToCheck = refToCheck.toLowerCase();

			// Don't validate empty refs
			if (!refToCheck || refToCheck.trim() === '') {
				Logger.trace(`Skipping validation: empty ref - refToCheck: '${refToCheck}`, 'useValidateRef');
				setValidationState('idle');
				return;
			}

			Logger.trace(`Setting validation state to 'validating' for ref: ${refToCheck}`, 'useValidateRef');
			setValidationState('validating');

			// Check if the ref matches any of the ones we already know
			const knownRefs = logState.refs ?? [];
			const matchingRefs = knownRefs.filter((ref) =>
				ref.name.toLowerCase().includes(debouncedRefToValidate.toLowerCase())
			);
			const isMatchingKnownRef = matchingRefs.length > 0;

			Logger.trace(
				`Checking against known refs - matchingRefNames: [${matchingRefs
					.map((r) => r.name)
					.join(', ')}]`,
				'useValidateRef'
			);

			if (isMatchingKnownRef) {
				Logger.debug(
					`Skipping validation: matches known ref(s) - refToCheck: ${refToCheck}`,
					'useValidateRef'
				);
				setValidationState('idle');
				return;
			}

			try {
				const isValid = await ValidateRef(repoPath, refToCheck);
				Logger.debug(
					`Backend validation completed - refToCheck: ${refToCheck}, isValid: ${isValid}`,
					'useValidateRef'
				);

				setValidationState(isValid ? 'valid' : 'invalid');
			} catch (error) {
				Logger.error(
					`Backend validation failed - refToCheck: ${refToCheck}, error: ${String(error)}`,
					'useValidateRef'
				);
				setValidationState('invalid');
			}
		};

		validateAsync(debouncedRefToValidate);
	}, [debouncedRefToValidate, logState.refs, repoPath, refToValidate]);

	const isValid = validationState === 'valid' ? true : validationState === 'invalid' ? false : null;

	return {
		validationState,
		isValid,
		didSkipValidation: validationState === 'idle',
		checkedRef: debouncedRefToValidate
	} as any;
}
