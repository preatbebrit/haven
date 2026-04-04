let pending: string | null = null;

export function setPendingToast(message: string) {
  pending = message;
}

export function popPendingToast(): string | null {
  const msg = pending;
  pending = null;
  return msg;
}
