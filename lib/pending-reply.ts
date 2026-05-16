// Hands off "user tapped Reply on an answer card" intent from /answers back to
// /chat. The chat consumes this on focus and arms `replyingTo` against the
// answer — but does NOT insert the answer into the chat yet. The answer only
// becomes a system-connection row at send time, so a user who taps Reply and
// then bails (clears the chip, navigates away) doesn't leak the card.
// In-memory only — same pattern as `lib/pending-connections.ts`. Slot is
// overwritten on each set so a stale pending reply can't outlive a fresh action.

import type { PendingConnection } from './pending-connections';

let pending: PendingConnection | null = null;

export function setPendingReplyTarget(c: PendingConnection): void {
  pending = c;
}

export function popPendingReplyTarget(): PendingConnection | null {
  const v = pending;
  pending = null;
  return v;
}
