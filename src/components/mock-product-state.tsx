"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { FutureSelfIdentityVersion } from "@/lib/domain";
import { activeIdentityVersion } from "@/lib/mock-data";

interface MockProductStateValue {
  activeIdentity: FutureSelfIdentityVersion | null;
  archiveActiveIdentity: () => void;
  activateMockIdentity: () => void;
}

const MockProductState = createContext<MockProductStateValue | null>(null);

export function MockProductStateProvider({ children }: { children: React.ReactNode }) {
  const [activeIdentity, setActiveIdentity] = useState<FutureSelfIdentityVersion | null>(
    activeIdentityVersion,
  );
  const value = useMemo(
    () => ({
      activeIdentity,
      archiveActiveIdentity: () => setActiveIdentity(null),
      activateMockIdentity: () => setActiveIdentity(activeIdentityVersion),
    }),
    [activeIdentity],
  );

  return <MockProductState.Provider value={value}>{children}</MockProductState.Provider>;
}

export function useMockProductState() {
  const value = useContext(MockProductState);
  if (!value) throw new Error("useMockProductState must be used inside MockProductStateProvider");
  return value;
}
