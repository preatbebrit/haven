import { useSyncExternalStore } from 'react';

export type Rect = { x: number; y: number; width: number; height: number };
export type PromptTransitionSource = { rect: Rect; groupId: string } | null;

let current: PromptTransitionSource = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setPromptTransitionSource(source: PromptTransitionSource): void {
  current = source;
  emit();
}

export function getPromptTransitionSource(): PromptTransitionSource {
  return current;
}

export function clearPromptTransitionSource(): void {
  if (current === null) return;
  current = null;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePromptTransitionSource(): PromptTransitionSource {
  return useSyncExternalStore(subscribe, getPromptTransitionSource, getPromptTransitionSource);
}
