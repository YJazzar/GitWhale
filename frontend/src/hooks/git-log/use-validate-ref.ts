import { useDebounce } from '@uidotdev/usehooks';
import { useEffect, useState } from 'react';
import { ValidateRef } from '../../../wailsjs/go/backend/App';
import { Logger } from '../../utils/logger';
import { useRepoLogState } from '../state/repo/use-git-log-state';

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

export interface UseValidateRefResult {
	validationState: ValidationState;
	isValid: boolean | null;

	// true if the passed in ref was not validated because it partially matches one of the known refs in the repo
	didSkipValidation: boolean;
	validatedRef: string;
}

/**
 * Hook to validate Git references with debounced validation
 */
export function useValidateRef(repoPath: string, refToValidate: string): UseValidateRefResult {
	const { refs } = useRepoLogState(repoPath);
	const [validationState, setValidationState] = useState<ValidationState>('idle');
	const debouncedRefToValidate = useDebounce(refToValidate, 200);

	useEffect(() => {
		const validateAsync = async (refToCheck: string) => {
			refToCheck = refToCheck.toLowerCase();

			// Don't validate empty refs
			if (!refToCheck || refToCheck.trim() === '') {
				setValidationState('idle');
				return;
			}

			setValidationState('validating');

			// Check if the ref matches any of the ones we already know
			const knownRefs = refs ?? [];
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
	}, [debouncedRefToValidate, refs, repoPath, refToValidate]);

	const isValid = validationState === 'valid' ? true : validationState === 'invalid' ? false : null;

	return {
		validationState,
		isValid,
		didSkipValidation: validationState === 'idle',
		validatedRef: debouncedRefToValidate,
	};
}
