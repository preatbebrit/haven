export type PendingConnection = {
  handle: string;
  avatarColor: string;
  answer: string;
};

let liked: PendingConnection[] = [];

export function addPendingConnection(c: PendingConnection) {
  liked.push(c);
}

export function popPendingConnections(): PendingConnection[] {
  const result = liked;
  liked = [];
  return result;
}

export function peekPendingConnections(): PendingConnection[] {
  return liked;
}
