import { useSyncExternalStore } from 'react';

export type Rect = { x: number; y: number; width: number; height: number };
export type HouseRulesTransitionSource = { rect: Rect } | null;

let current: HouseRulesTransitionSource = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setHouseRulesTransitionSource(source: HouseRulesTransitionSource): void {
  current = source;
  emit();
}

export function getHouseRulesTransitionSource(): HouseRulesTransitionSource {
  return current;
}

export function clearHouseRulesTransitionSource(): void {
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

export function useHouseRulesTransitionSource(): HouseRulesTransitionSource {
  return useSyncExternalStore(
    subscribe,
    getHouseRulesTransitionSource,
    getHouseRulesTransitionSource,
  );
}
