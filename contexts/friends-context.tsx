import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { getCurrentUserId } from '@/lib/current-user';
import { findSharedChat } from '@/lib/shared-chat-gate';

// Demo behavior: outgoing friend requests auto-accept on the recipient's
// behalf after this delay. Once a real backend lands this scheduler can go.
const AUTO_ACCEPT_DELAY_MS = 15_000;

import {
  block as storageBlock,
  getBlocks,
  unblock as storageUnblock,
  type BlockEntry,
} from '@/lib/blocks-storage';
import {
  bannedIdsFrom,
  getReports,
  reportUser as storageReportUser,
  type ReportCategory,
  type ReportEntry,
} from '@/lib/friend-report-log';
import {
  acceptRequest as storageAcceptRequest,
  cancelPendingFromTo,
  cancelRequest as storageCancelRequest,
  declineRequest as storageDeclineRequest,
  getRequests,
  sendRequest as storageSendRequest,
  type FriendRequest,
  type SendRequestResult,
} from '@/lib/friend-requests-storage';
import {
  addFriendship,
  getFriendships,
  removeFriendship as storageRemoveFriendship,
  type Friendship,
} from '@/lib/friends-storage';
import {
  getShares,
  share as storageShare,
  unshare as storageUnshare,
  type ShareEntry,
  type ShareKind,
} from '@/lib/profile-shares-storage';
import {
  getTopFriends,
  removeFriendFromTopFriends,
  setSlot as storageSetSlot,
  TOP_FRIENDS_SIZE,
  type TopFriendsArray,
} from '@/lib/top-friends-storage';

type FriendsContextValue = {
  ready: boolean;
  currentUserId: string;

  // Live state
  friendships: Friendship[];
  incomingRequests: FriendRequest[];   // pending only
  outgoingRequests: FriendRequest[];   // pending only
  outgoingAccepted: FriendRequest[];   // requests I sent that were accepted
  topFriends: TopFriendsArray;         // length TOP_FRIENDS_SIZE array for currentUser
  shares: ShareEntry[];
  blocks: BlockEntry[];
  /** Users globally hidden because they hit the strike limit (see STRIKE_LIMIT). */
  bannedIds: Set<string>;

  // Mutators (all fire-and-forget, return result for UX where useful)
  sendFriendRequest: (targetId: string) => Promise<SendRequestResult>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  cancelFriendRequest: (requestId: string) => Promise<void>;
  unfriend: (targetId: string) => Promise<void>;
  blockUser: (targetId: string) => Promise<void>;
  unblockUser: (targetId: string) => Promise<void>;
  setTopFriendsSlot: (position: number, friendId: string | null) => Promise<void>;
  shareWith: (viewerId: string, kind: ShareKind) => Promise<void>;
  unshareWith: (viewerId: string, kind: ShareKind) => Promise<void>;
  /**
   * Submit a report. Returns the resulting strike count for the reported user
   * and whether they've now crossed the ban threshold.
   */
  submitReport: (input: {
    reportedId: string;
    category: ReportCategory;
    customReason?: string;
    messageId?: string;
  }) => Promise<{ strikeCount: number; banned: boolean }>;

  // Reload from storage (used by dev seed)
  reloadAll: () => Promise<void>;
};

const FriendsContext = createContext<FriendsContextValue | null>(null);

export function FriendsProvider({ children }: { children: ReactNode }) {
  const currentUserId = getCurrentUserId();

  const [ready, setReady] = useState(false);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [topFriends, setTopFriendsState] = useState<TopFriendsArray>(() =>
    Array.from({ length: TOP_FRIENDS_SIZE }, () => null),
  );
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [blocks, setBlocks] = useState<BlockEntry[]>([]);
  const [reports, setReports] = useState<ReportEntry[]>([]);
  // Track pending auto-accept timers so we can clear them on unmount and avoid
  // double-firing if a request is cancelled/declined before the timer fires.
  const autoAcceptTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const reloadAll = useCallback(async () => {
    const [fs, rs, tf, sh, bl, rep] = await Promise.all([
      getFriendships(),
      getRequests(),
      getTopFriends(currentUserId),
      getShares(),
      getBlocks(),
      getReports(),
    ]);
    setFriendships(fs);
    setRequests(rs);
    setTopFriendsState(tf);
    setShares(sh);
    setBlocks(bl);
    setReports(rep);
  }, [currentUserId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await reloadAll();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadAll]);

  // Clear any in-flight auto-accept timers on unmount so we don't fire into an
  // unmounted provider. Safe to capture the ref's current value here because
  // we only need to clear the live set at unmount time.
  useEffect(() => {
    const timers = autoAcceptTimersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  const scheduleAutoAccept = useCallback((requestId: string) => {
    const timers = autoAcceptTimersRef.current;
    // Replace any existing timer for this id (shouldn't normally happen, but
    // protects against double-scheduling).
    const existing = timers.get(requestId);
    if (existing) clearTimeout(existing);
    const handle = setTimeout(async () => {
      timers.delete(requestId);
      // resolveRequest is a no-op if the request was cancelled/declined in
      // the meantime, so this is safe to call unconditionally.
      const resolved = await storageAcceptRequest(requestId);
      if (!resolved) return;
      setRequests((prev) => prev.map((r) => (r.id === requestId ? resolved : r)));
      const all = await getFriendships();
      setFriendships(all);
    }, AUTO_ACCEPT_DELAY_MS);
    timers.set(requestId, handle);
  }, []);

  const clearAutoAcceptTimer = useCallback((requestId: string) => {
    const timers = autoAcceptTimersRef.current;
    const t = timers.get(requestId);
    if (t) {
      clearTimeout(t);
      timers.delete(requestId);
    }
  }, []);

  const incomingRequests = useMemo(
    () => requests.filter((r) => r.recipientId === currentUserId && r.status === 'pending'),
    [requests, currentUserId],
  );
  const outgoingRequests = useMemo(
    () => requests.filter((r) => r.senderId === currentUserId && r.status === 'pending'),
    [requests, currentUserId],
  );
  const outgoingAccepted = useMemo(
    () => requests.filter((r) => r.senderId === currentUserId && r.status === 'accepted'),
    [requests, currentUserId],
  );

  const sendFriendRequest = useCallback(
    async (targetId: string): Promise<SendRequestResult> => {
      const sharedChatId = findSharedChat(currentUserId, targetId);
      const result = await storageSendRequest(currentUserId, targetId, sharedChatId);
      if (result.ok) {
        setRequests((prev) => [...prev, result.request]);
        scheduleAutoAccept(result.request.id);
      }
      return result;
    },
    [currentUserId, scheduleAutoAccept],
  );

  const acceptFriendRequest = useCallback(async (requestId: string) => {
    const resolved = await storageAcceptRequest(requestId);
    if (!resolved) return;
    setRequests((prev) => prev.map((r) => (r.id === requestId ? resolved : r)));
    // The storage layer added the friendship — reflect in state.
    const all = await getFriendships();
    setFriendships(all);
  }, []);

  const declineFriendRequest = useCallback(async (requestId: string) => {
    const resolved = await storageDeclineRequest(requestId);
    if (!resolved) return;
    setRequests((prev) => prev.map((r) => (r.id === requestId ? resolved : r)));
  }, []);

  const cancelFriendRequest = useCallback(
    async (requestId: string) => {
      clearAutoAcceptTimer(requestId);
      const resolved = await storageCancelRequest(requestId);
      if (!resolved) return;
      setRequests((prev) => prev.map((r) => (r.id === requestId ? resolved : r)));
    },
    [clearAutoAcceptTimer],
  );

  const unfriend = useCallback(
    async (targetId: string) => {
      await storageRemoveFriendship(currentUserId, targetId);
      await removeFriendFromTopFriends(targetId);
      await storageUnshare(currentUserId, targetId, 'gallery');
      await storageUnshare(currentUserId, targetId, 'prompts');
      await storageUnshare(currentUserId, targetId, 'identity');
      // Reload affected slices.
      const [fs, tf, sh] = await Promise.all([
        getFriendships(),
        getTopFriends(currentUserId),
        getShares(),
      ]);
      setFriendships(fs);
      setTopFriendsState(tf);
      setShares(sh);
    },
    [currentUserId],
  );

  const blockUser = useCallback(
    async (targetId: string) => {
      // Cascade: unfriend → cancel pending in both directions → write block.
      await storageRemoveFriendship(currentUserId, targetId);
      await removeFriendFromTopFriends(targetId);
      await storageUnshare(currentUserId, targetId, 'gallery');
      await storageUnshare(currentUserId, targetId, 'prompts');
      await storageUnshare(currentUserId, targetId, 'identity');
      await cancelPendingFromTo(currentUserId, targetId);
      await cancelPendingFromTo(targetId, currentUserId);
      await storageBlock(currentUserId, targetId);
      await reloadAll();
    },
    [currentUserId, reloadAll],
  );

  const unblockUser = useCallback(
    async (targetId: string) => {
      await storageUnblock(currentUserId, targetId);
      const bl = await getBlocks();
      setBlocks(bl);
    },
    [currentUserId],
  );

  const setTopFriendsSlot = useCallback(
    async (position: number, friendId: string | null) => {
      await storageSetSlot(currentUserId, position, friendId);
      const tf = await getTopFriends(currentUserId);
      setTopFriendsState(tf);
    },
    [currentUserId],
  );

  const shareWith = useCallback(
    async (viewerId: string, kind: ShareKind) => {
      await storageShare(currentUserId, viewerId, kind);
      const sh = await getShares();
      setShares(sh);
    },
    [currentUserId],
  );

  const unshareWith = useCallback(
    async (viewerId: string, kind: ShareKind) => {
      await storageUnshare(currentUserId, viewerId, kind);
      const sh = await getShares();
      setShares(sh);
    },
    [currentUserId],
  );

  const bannedIds = useMemo(() => bannedIdsFrom(reports), [reports]);

  const submitReport = useCallback(
    async (input: {
      reportedId: string;
      category: ReportCategory;
      customReason?: string;
      messageId?: string;
    }) => {
      const result = await storageReportUser({
        reporterId: currentUserId,
        reportedId: input.reportedId,
        category: input.category,
        customReason: input.customReason,
        messageId: input.messageId,
      });
      setReports(result.reports);
      return { strikeCount: result.strikeCount, banned: result.banned };
    },
    [currentUserId],
  );

  const value = useMemo<FriendsContextValue>(
    () => ({
      ready,
      currentUserId,
      friendships,
      incomingRequests,
      outgoingRequests,
      outgoingAccepted,
      topFriends,
      shares,
      blocks,
      bannedIds,
      sendFriendRequest,
      acceptFriendRequest,
      declineFriendRequest,
      cancelFriendRequest,
      unfriend,
      blockUser,
      unblockUser,
      setTopFriendsSlot,
      shareWith,
      unshareWith,
      submitReport,
      reloadAll,
    }),
    [
      ready,
      currentUserId,
      friendships,
      incomingRequests,
      outgoingRequests,
      outgoingAccepted,
      topFriends,
      shares,
      blocks,
      bannedIds,
      sendFriendRequest,
      acceptFriendRequest,
      declineFriendRequest,
      cancelFriendRequest,
      unfriend,
      blockUser,
      unblockUser,
      setTopFriendsSlot,
      shareWith,
      unshareWith,
      submitReport,
      reloadAll,
    ],
  );

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function useFriends(): FriendsContextValue {
  const ctx = useContext(FriendsContext);
  if (!ctx) {
    throw new Error('useFriends must be used within <FriendsProvider>');
  }
  return ctx;
}
