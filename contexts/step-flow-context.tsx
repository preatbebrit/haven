import { createContext, useContext } from 'react';

export type StepFlowPrimaryButton = {
  label: string;
  inactive: boolean;
  onPress: () => void;
};

export type StepFlowSecondaryButton = {
  label: string;
  onPress: () => void;
};

export type StepFlowValue = {
  setPrimaryButton: (config: StepFlowPrimaryButton) => void;
  setSecondaryButton: (config: StepFlowSecondaryButton | null) => void;
  setBackHandler: (handler: (() => void) | null) => void;
  advance: () => void;
  retreat: () => void;
  finish: () => void;
};

export const StepFlowContext = createContext<StepFlowValue | null>(null);

export function useStepFlow(): StepFlowValue {
  const ctx = useContext(StepFlowContext);
  if (!ctx) throw new Error('useStepFlow must be used within a StepFlowContext.Provider');
  return ctx;
}
