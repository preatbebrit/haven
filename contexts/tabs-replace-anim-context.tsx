import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// Per-call override for the (tabs) Stack.Screen's `animationTypeForReplace`.
// Default 'push' means `router.replace('/(tabs)/...')` slides in from the
// right (the normal "moving forward" feel — used by welcome boot and
// onboarding completion). Chat leave / expiry sets this to 'pop' just
// before navigating so chat-selection slides in from the left, matching
// the "going back to the chat browser" semantics.

export type TabsReplaceAnim = 'push' | 'pop';

type Value = {
  anim: TabsReplaceAnim;
  setAnim: (a: TabsReplaceAnim) => void;
};

const TabsReplaceAnimContext = createContext<Value | null>(null);

export function TabsReplaceAnimProvider({ children }: { children: ReactNode }) {
  const [anim, setAnimState] = useState<TabsReplaceAnim>('push');
  const setAnim = useCallback((a: TabsReplaceAnim) => setAnimState(a), []);
  const value = useMemo<Value>(() => ({ anim, setAnim }), [anim, setAnim]);
  return <TabsReplaceAnimContext.Provider value={value}>{children}</TabsReplaceAnimContext.Provider>;
}

export function useTabsReplaceAnim(): Value {
  const ctx = useContext(TabsReplaceAnimContext);
  if (!ctx) throw new Error('useTabsReplaceAnim must be used within TabsReplaceAnimProvider');
  return ctx;
}
