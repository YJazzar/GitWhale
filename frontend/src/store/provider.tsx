/**
 * Provider component that wraps the app with Jotai Provider
 * This ensures all atoms are properly scoped and managed
 */

import { Provider } from 'jotai';
import { ReactNode } from 'react';

interface GlobalStateProviderProps {
	children: ReactNode;
}

export function GlobalStateProvider({ children }: GlobalStateProviderProps) {
	return <Provider>{children}</Provider>;
}
