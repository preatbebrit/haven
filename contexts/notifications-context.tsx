import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  clearSeen as storageClearSeen,
  getSeen,
  markSeen as storageMarkSeen,
} from '@/lib/notifications-storage';

type NotificationsContextValue = {
  ready: boolean;
  seenIds: Set<string>;
  markSeen: (ids: string[]) => void;
  clearSeen: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const initial = await getSeen();
      if (!cancelled) {
        setSeenIds(initial);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markSeen = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setSeenIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of ids) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      if (!changed) return prev;
      void storageMarkSeen(ids);
      return next;
    });
  }, []);

  const clearSeen = useCallback(async () => {
    await storageClearSeen();
    setSeenIds(new Set());
  }, []);

  const value = useMemo<NotificationsContextValue>(
    () => ({ ready, seenIds, markSeen, clearSeen }),
    [ready, seenIds, markSeen, clearSeen],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotificationsContext(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotificationsContext must be used within <NotificationsProvider>');
  }
  return ctx;
}
