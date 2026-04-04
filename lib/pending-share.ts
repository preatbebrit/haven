let pending: { groupId: string; answer: string } | null = null;

export function setPendingPromptShare(groupId: string, answer: string) {
  pending = { groupId, answer };
}

export function peekPendingPromptShare() {
  return pending;
}

export function clearPendingPromptShare() {
  pending = null;
}
