import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type OutStatus = 'yes' | 'no' | 'sort-of';

export type OnboardingContextValue = {
  username: string;
  setUsername: (v: string) => void;
  dateOfBirth: string;
  setDateOfBirth: (v: string) => void;
  lockPin: string | null;
  setLockPin: (v: string | null) => void;
  lockSkipped: boolean;
  setLockSkipped: (v: boolean) => void;
  genderId: string | null;
  setGenderId: (v: string | null) => void;
  pronounPreset: string | null;
  setPronounPreset: (v: string | null) => void;
  pronounsCustom: string;
  setPronounsCustom: (v: string) => void;
  outStatus: OutStatus | null;
  setOutStatus: (v: OutStatus | null) => void;
  acceptingEnvironment: string | null;
  setAcceptingEnvironment: (v: string | null) => void;
  identities: string[];
  setIdentities: (v: string[]) => void;
  toggleIdentity: (id: string) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [lockPin, setLockPin] = useState<string | null>(null);
  const [lockSkipped, setLockSkipped] = useState(false);
  const [genderId, setGenderId] = useState<string | null>(null);
  const [pronounPreset, setPronounPreset] = useState<string | null>(null);
  const [pronounsCustom, setPronounsCustom] = useState('');
  const [outStatus, setOutStatus] = useState<OutStatus | null>(null);
  const [acceptingEnvironment, setAcceptingEnvironment] = useState<string | null>(null);
  const [identities, setIdentities] = useState<string[]>([]);

  const toggleIdentity = useCallback((id: string) => {
    setIdentities((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const value = useMemo(
    () => ({
      username,
      setUsername,
      dateOfBirth,
      setDateOfBirth,
      lockPin,
      setLockPin,
      lockSkipped,
      setLockSkipped,
      genderId,
      setGenderId,
      pronounPreset,
      setPronounPreset,
      pronounsCustom,
      setPronounsCustom,
      outStatus,
      setOutStatus,
      acceptingEnvironment,
      setAcceptingEnvironment,
      identities,
      setIdentities,
      toggleIdentity,
    }),
    [
      username,
      dateOfBirth,
      lockPin,
      lockSkipped,
      genderId,
      pronounPreset,
      pronounsCustom,
      outStatus,
      acceptingEnvironment,
      identities,
      toggleIdentity,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return ctx;
}
