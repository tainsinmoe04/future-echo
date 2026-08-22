"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { FutureSelfIdentityVersion, JourneyMoment } from "@/lib/domain";
import { activeIdentityVersion, MOCK_TODAY, pastIdentityVersion } from "@/lib/mock-data";

const initialIdentityVersions: readonly FutureSelfIdentityVersion[] = [
  pastIdentityVersion,
  activeIdentityVersion,
];

const exampleJourneyMoment: JourneyMoment = {
  id: "journey-difficult-day",
  identityVersionId: activeIdentityVersion.id,
  occurredAt: "2026-01-16T23:40:00Z",
  revisitAt: "2026-07-16T23:40:00Z",
  originalExcerpt:
    "I feel like I am falling behind everyone. I cannot tell whether I am making the wrong choices or whether I am simply too tired to see them clearly.",
  relatedAiReply:
    "This day may be making everything feel more final than it is. The part of you wondering whether these choices still fit has not disappeared. It may simply be difficult to reach beneath the exhaustion. You do not have to settle your whole life tonight.",
  myNote: "I may be exhausted, not lost.",
  aiInterpretation:
    "One possible reading is that exhaustion was narrowing the choices you could see, without deciding what those choices should be.",
  consent: {
    useInAiContext: false,
    includeMyNoteInAiContext: false,
    recordedAt: "2026-01-16T23:44:00Z",
  },
};

export interface CreateIdentityInput {
  definition: string;
  horizon: {
    targetMonth: string;
    label: string;
  };
}

interface MockProductStateValue {
  identityVersions: readonly FutureSelfIdentityVersion[];
  activeIdentity: FutureSelfIdentityVersion | null;
  journeyMoment: JourneyMoment | null;
  createIdentityVersion: (input: CreateIdentityInput) => void;
  editActiveIdentityDefinition: (definition: string) => void;
  archiveActiveIdentity: () => void;
  activateMockIdentity: () => void;
  saveJourneyMoment: (moment: JourneyMoment) => void;
  deleteJourneyMoment: () => void;
}

const MockProductState = createContext<MockProductStateValue | null>(null);

function findActiveIdentity(versions: readonly FutureSelfIdentityVersion[]) {
  return versions.find((version) => version.status === "active") ?? null;
}

export function MockProductStateProvider({ children }: { children: React.ReactNode }) {
  const [identityVersions, setIdentityVersions] = useState(initialIdentityVersions);
  const [journeyMoment, setJourneyMoment] = useState<JourneyMoment | null>(exampleJourneyMoment);

  const value = useMemo(
    () => ({
      identityVersions,
      journeyMoment,
      activeIdentity: findActiveIdentity(identityVersions),
      createIdentityVersion: ({ definition, horizon }: CreateIdentityInput) =>
        setIdentityVersions((current) => {
          const trimmed = definition.trim();
          if (!trimmed) return current;

          const previous = findActiveIdentity(current);
          const journeyId = previous?.journeyId ?? "new-journey";
          const version = previous
            ? Math.max(...current.filter((item) => item.journeyId === journeyId).map((item) => item.version)) + 1
            : 1;

          const supersededCurrent = previous
            ? current.map((item) =>
                item.id === previous.id
                  ? { ...item, status: "past" as const, supersededAt: `${MOCK_TODAY}T00:00:00Z` }
                  : item,
              )
            : current;

          return [
            ...supersededCurrent,
            {
              id: `${journeyId}-v${version}`,
              journeyId,
              version,
              status: "active" as const,
              definition: trimmed,
              horizon,
              principles: [],
              createdAt: `${MOCK_TODAY}T00:00:00Z`,
            },
          ];
        }),
      editActiveIdentityDefinition: (definition: string) =>
        setIdentityVersions((current) => {
          const trimmed = definition.trim();
          const active = findActiveIdentity(current);
          if (!trimmed || !active || trimmed === active.definition) return current;

          // Editing the definition creates a new version; existing records
          // keep the version under which they were created.
          const version = Math.max(...current.map((item) => item.version)) + 1;
          return [
            ...current.map((item) =>
              item.id === active.id
                ? { ...item, status: "past" as const, supersededAt: `${MOCK_TODAY}T00:00:00Z` }
                : item,
            ),
            {
              ...active,
              id: `${active.journeyId}-v${version}`,
              version,
              status: "active" as const,
              definition: trimmed,
              createdAt: `${MOCK_TODAY}T00:00:00Z`,
              supersededAt: undefined,
            },
          ];
        }),
      archiveActiveIdentity: () =>
        setIdentityVersions((current) =>
          current.map((item) =>
            item.status === "active"
              ? { ...item, status: "past" as const, supersededAt: `${MOCK_TODAY}T00:00:00Z` }
              : item,
          ),
        ),
      activateMockIdentity: () =>
        setIdentityVersions((current) => {
          if (findActiveIdentity(current)) return current;
          return current.map((item) =>
            item.id === activeIdentityVersion.id
              ? { ...item, status: "active" as const, supersededAt: undefined }
              : item,
          );
        }),
      saveJourneyMoment: setJourneyMoment,
      deleteJourneyMoment: () => setJourneyMoment(null),
    }),
    [identityVersions, journeyMoment],
  );

  return <MockProductState.Provider value={value}>{children}</MockProductState.Provider>;
}

export function useMockProductState() {
  const value = useContext(MockProductState);
  if (!value) throw new Error("useMockProductState must be used inside MockProductStateProvider");
  return value;
}
