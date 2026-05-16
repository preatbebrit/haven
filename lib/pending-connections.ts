import type { GenderSymbol } from '@/components/ui/gender-avatar';
import type { PromptColors } from '@/constants/theme';

export type PendingConnection = {
  handle: string;
  pronouns: string;
  avatarColor: string;
  avatarSymbol: GenderSymbol;
  answer: string;
  question: string;
  promptColors: PromptColors;
  /**
   * `true` when the answer was shared into the chat via Reply (which renders
   * the card without the "you liked this" heart badge). `false`/undefined when
   * shared via Like.
   */
  viaReply?: boolean;
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
