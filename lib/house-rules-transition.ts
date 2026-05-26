import { useSyncExternalStore } from 'react';

export type Rect = { x: number; y: number; width: number; height: number };
export type HouseRulesTransitionSource = { rect: Rect } | null;

let current: HouseRulesTransitionSource = null;
// True from the moment the home tile is tapped through to when the house-rules
// route unmounts. While true, the home tile hides itself so only the morphing
// copy of the tile visual is on screen (avoids a "two read-me badges" flash).
let morphActive = false;
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

export function setHouseRulesMorphActive(active: boolean): void {
  if (morphActive === active) return;
  morphActive = active;
  emit();
}

export function getHouseRulesMorphActive(): boolean {
  return morphActive;
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

export function useHouseRulesMorphActive(): boolean {
  return useSyncExternalStore(subscribe, getHouseRulesMorphActive, getHouseRulesMorphActive);
}
