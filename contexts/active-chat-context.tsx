import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  CHAT_DURATION_MS,
  clearActiveChat,
  getActiveChat,
  isExpired,
  msLeft as computeMsLeft,
  setActiveChat,
} from '@/lib/active-chat-storage';
import { clearAnswerLikes } from '@/lib/answer-likes-storage';
import { clearChatState } from '@/lib/chat-state-storage';

type ActiveChatContextValue = {
  isHydrated: boolean;
  activeChatId: string | null;
  joinedAt: number | null;
  msLeft: number;
  justExpired: boolean;
  joinChat: (chatId: string) => Promise<void>;
  leaveChat: () => Promise<void>;
  acknowledgeExpiry: () => void;
};

const ActiveChatContext = createContext<ActiveChatContextValue | null>(null);

const TICK_MS = 30_000;

export function ActiveChatProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [joinedAt, setJoinedAt] = useState<number | null>(null);
  const [msLeft, setMsLeft] = useState<number>(CHAT_DURATION_MS);
  const [justExpired, setJustExpired] = useState(false);

  // Refs let the AppState/interval callbacks read the latest state without
  // closure staleness or re-creating subscriptions.
  const joinedAtRef = useRef<number | null>(null);
  const activeChatIdRef = useRef<string | null>(null);
  joinedAtRef.current = joinedAt;
  activeChatIdRef.current = activeChatId;

  const handleExpire = useCallback(async () => {
    const expiringId = activeChatIdRef.current;
    if (!expiringId) return;
    await clearActiveChat();
    await clearChatState(expiringId);
    await clearAnswerLikes(expiringId);
    setActiveChatId(null);
    setJoinedAt(null);
    setMsLeft(0);
    setJustExpired(true);
  }, []);

  const recomputeAndMaybeExpire = useCallback(() => {
    const ja = joinedAtRef.current;
    if (ja == null) {
      setMsLeft(CHAT_DURATION_MS);
      return;
    }
    const left = computeMsLeft(ja);
    setMsLeft(left);
    if (left <= 0 && activeChatIdRef.current) {
      void handleExpire();
    }
  }, [handleExpire]);

  // Hydrate from AsyncStorage on mount. If the persisted chat is already
  // expired, clear it silently — this is the cold-launch path, no overlay.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getActiveChat();
      if (cancelled) return;
      if (stored && isExpired(stored.joinedAt)) {
        await clearActiveChat();
        await clearChatState(stored.chatId);
        await clearAnswerLikes(stored.chatId);
        setActiveChatId(null);
        setJoinedAt(null);
        setMsLeft(0);
      } else if (stored) {
        setActiveChatId(stored.chatId);
        setJoinedAt(stored.joinedAt);
        setMsLeft(computeMsLeft(stored.joinedAt));
      }
      setIsHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tick + AppState listener for live countdown and mid-session expiry.
  useEffect(() => {
    const interval = setInterval(recomputeAndMaybeExpire, TICK_MS);
    const onAppStateChange = (status: AppStateStatus) => {
      if (status === 'active') recomputeAndMaybeExpire();
    };
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [recomputeAndMaybeExpire]);

  const joinChat = useCallback(async (chatId: string) => {
    // Fresh join always starts with a clean message history. Defensive in case
    // a prior session was killed before leaveChat/handleExpire could clear it.
    await clearChatState(chatId);
    await clearAnswerLikes(chatId);
    // Reuse the timestamp setActiveChat persisted so in-memory `joinedAt`
    // matches storage exactly. Two separate Date.now() calls drift by a few
    // ms, and sim-event row ids derived from in-memory joinedAt then fail to
    // match the persisted ids on the next reload — appending duplicates.
    const joinedAt = await setActiveChat(chatId);
    setActiveChatId(chatId);
    setJoinedAt(joinedAt);
    setMsLeft(CHAT_DURATION_MS);
    setJustExpired(false);
  }, []);

  const leaveChat = useCallback(async () => {
    const leavingId = activeChatIdRef.current;
    await clearActiveChat();
    if (leavingId) {
      await clearChatState(leavingId);
      await clearAnswerLikes(leavingId);
    }
    setActiveChatId(null);
    setJoinedAt(null);
    setMsLeft(0);
    setJustExpired(false);
  }, []);

  const acknowledgeExpiry = useCallback(() => {
    setJustExpired(false);
  }, []);

  return (
    <ActiveChatContext.Provider
      value={{
        isHydrated,
        activeChatId,
        joinedAt,
        msLeft,
        justExpired,
        joinChat,
        leaveChat,
        acknowledgeExpiry,
      }}
    >
      {children}
    </ActiveChatContext.Provider>
  );
}

export function useActiveChat(): ActiveChatContextValue {
  const ctx = useContext(ActiveChatContext);
  if (!ctx) {
    throw new Error('useActiveChat must be used within ActiveChatProvider');
  }
  return ctx;
}
