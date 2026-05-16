import { createContext, useContext } from 'react';

/** True once the JS splash overlay has finished its fade-out. */
export const SplashContext = createContext<{ done: boolean }>({ done: true });

export function useSplashDone(): boolean {
  return useContext(SplashContext).done;
}
