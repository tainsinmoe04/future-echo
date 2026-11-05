"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ConversationMessage, FutureSelfIdentityVersion, JourneyMoment } from "@/lib/domain";
import { backendRequest, BackendRequestError } from "@/lib/backend-client";
import { contextSyncPayload } from "@/server/context-sync";
import { localReplyPayload } from "@/lib/local-ai-input";
import type { SavedPlaylist } from "@/lib/playlist";
import { activeIdentityVersion } from "@/lib/mock-data";
import { firstMessage, previewReply, connectedConversation, type MessengerThread } from "@/lib/mock-messenger";
import { LIVE_CONNECTION_KEY, parseLiveConnectionConsent } from "@/lib/live-connection";
import { changeMomentConsent, keepMoment } from "@/lib/personal-space";
import { DEFAULT_PREFERENCES, type SpacePreferences } from "@/lib/scrapbook";
import { MAX_IDENTITY_LENGTH, MAX_MESSAGE_LENGTH } from "@/lib/redaction";
import { createJournalSession } from "@/lib/journal-session";
import { serializeJournalBackup } from "@/lib/journal-backup";
import type { JournalSnapshot } from "@/lib/journal-snapshot";

export interface CreateIdentityInput {
  connectLiveAI?: boolean;
  newJourney?: boolean;
  definition: string;
  horizon: { targetMonth: string; label: string };
  reason?: string;
  anchor?: string;
  principles?: readonly string[];
}

interface MockProductStateValue {
  trialAI: boolean;
  trialProvider: "SEA-LION" | "OpenRouter";
  liveAIAvailable: boolean;
  connectedProvider: "SEA-LION" | "Gemini";
  setMomentConsent: (id: string, words: boolean, note: boolean) => void;
  connectedAI: boolean;
  connectionError: string;
  connectAI: () => Promise<void>;
  disconnectAI: () => Promise<void>;
  loadPastConversation: (id: string) => Promise<void>;
  journalSnapshot: JournalSnapshot;
  updateJournal: (change: (current: JournalSnapshot) => JournalSnapshot) => void;
  restoreJournal: (snapshot: JournalSnapshot) => Promise<void>;
  readRecovery: () => Promise<JournalSnapshot | null>;
  deleteRecovery: () => Promise<void>;
  storageStatus: "loading" | "saving" | "saved" | "error";
  storageError: string;
  retryStorage: () => void;
  exportJournal: () => string;
  preferences: SpacePreferences;
  updatePreferences: (patch: Partial<SpacePreferences>) => void;
  identityVersions: readonly FutureSelfIdentityVersion[];
  activeIdentity: FutureSelfIdentityVersion | null;
  moments: readonly JourneyMoment[];
  threads: Record<string, MessengerThread>;
  createIdentityVersion: (input: CreateIdentityInput) => void;
  editActiveIdentityDefinition: (definition: string) => void;
  archiveActiveIdentity: () => void;
  activateMockIdentity: () => void;
  saveJourneyMoment: (moment: JourneyMoment) => void;
  deleteMoment: (id: string) => void;
  setThreadDraft: (identityId: string, draft: string) => void;
  sendMessage: (identityId: string, content: string) => void;
  ensureGreeting: (identityId: string) => void;
}

const MockProductState = createContext<MockProductStateValue | null>(null);
const emptyThread: MessengerThread = { messages: [], draft: "", typing: false };
const initialJournal: JournalSnapshot = { version: 1, preferences: DEFAULT_PREFERENCES,
  identityVersions: [], moments: [] };

export function MockProductStateProvider({ children, trialAI = false, trialProvider = "OpenRouter", liveAIAvailable = false, connectedProvider = "Gemini" }: { children: React.ReactNode; trialAI?: boolean; trialProvider?: "SEA-LION" | "OpenRouter"; liveAIAvailable?: boolean; connectedProvider?: "SEA-LION" | "Gemini" }) {
  const [journal] = useState(() => createJournalSession(initialJournal));
  const local = useSyncExternalStore(journal.subscribe, journal.getSnapshot, journal.getSnapshot);
  const { preferences, identityVersions, moments } = local.snapshot;
  const setIdentityVersions = useCallback((change: (items: readonly FutureSelfIdentityVersion[]) => readonly FutureSelfIdentityVersion[]) => journal.update((current) => ({ ...current, identityVersions: change(current.identityVersions) })), [journal]);
  const setMoments = useCallback((change: (items: readonly JourneyMoment[]) => readonly JourneyMoment[]) => journal.update((current) => ({ ...current, moments: change(current.moments) })), [journal]);
  const updatePreferences = useCallback((patch: Partial<SpacePreferences>) => journal.update((current) => ({ ...current, preferences: { ...current.preferences, ...patch } })), [journal]);
  const exportJournal = useCallback(() => serializeJournalBackup(journal.getSnapshot().snapshot), [journal]);
  useEffect(() => { void journal.load(); }, [journal]);
  useEffect(() => {
    if (local.status !== "saving" && !(local.ready && local.status === "error")) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [local.ready, local.status]);
  const [threads, setThreads] = useState<Record<string, MessengerThread>>({});
  const [connectedAI, setConnectedAI] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [pendingLiveIdentity,setPendingLiveIdentity]=useState<string|null>(null);
  const automaticAttempt=useRef("");
  const connectionEpoch = useRef(0);
  const requests = useRef(new Set<string>());
  const attempts = useRef(new Map<string, { content: string; requestId: string }>());
  const contextQueue = useRef<Promise<unknown>>(Promise.resolve());
  const updateAccountContext = useCallback((body: unknown, method = "PUT") => {
    const pending = contextQueue.current.catch(() => {}).then(() => backendRequest("/api/context", body, method));
    contextQueue.current = pending;
    return pending;
  }, []);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const activeIdentity = identityVersions.find((identity) => identity.status === "active") ?? null;

  useEffect(() => {
    const pending = timers.current;
    return () => { pending.forEach(clearTimeout); pending.clear(); };
  }, []);

  const cancelReplies = useCallback(() => {
    connectionEpoch.current += 1;
    requests.current.clear();
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    setThreads((current) => Object.fromEntries(Object.entries(current).map(([id, thread]) => [id, { ...thread, typing: false }])));
  }, []);

  const connectAI = useCallback(async () => {
    if (trialAI) throw new Error("The private trial does not connect to cloud accounts.");
    if (!activeIdentity) throw new Error("Choose a direction first.");
    cancelReplies();
    const epoch = connectionEpoch.current;
    const session=await backendRequest<{user:{id:string}|null}>("/api/auth/session");
    if (!session.user) throw new Error("Sign in to connect live AI. Your direction stays on this device.");
    if(epoch!==connectionEpoch.current) throw new Error("Your direction changed. Connect the current one.");
    try{sessionStorage.setItem(LIVE_CONNECTION_KEY,JSON.stringify({identityId:activeIdentity.id,userId:session.user.id,provider:connectedProvider}));}catch{/* A tab without storage can still explicitly connect. */}
    await backendRequest("/api/auth/attest-adult",{adultConfirmed:true});
    await updateAccountContext(contextSyncPayload(activeIdentity, moments));
    const [history, saved] = await Promise.all([
      backendRequest<{ messages: ConversationMessage[] }>(`/api/conversations/${encodeURIComponent(activeIdentity.id)}`),
      backendRequest<{ playlists: SavedPlaylist[] }>("/api/playlists"),
    ]);
    if (epoch !== connectionEpoch.current) {
      await updateAccountContext({ archiveIdentityId: activeIdentity.id }, "POST");
      throw new Error("Your direction changed. Connect it again when ready.");
    }
    setThreads((current) => ({ ...current, [activeIdentity.id]: { draft: current[activeIdentity.id]?.draft ?? "", typing: false, messages: connectedConversation(history.messages,current[activeIdentity.id]?.messages??[],activeIdentity) } }));
    journal.update((current) => ({ ...current, playlists: [...(current.playlists ?? []).filter((p) => !saved.playlists.some((s) => s.id === p.id)), ...saved.playlists.filter((p) => current.identityVersions.some((i) => i.id === p.identityVersionId))] }));
    attempts.current.delete(activeIdentity.id);
    setConnectionError(""); setConnectedAI(true);
  }, [activeIdentity, moments, cancelReplies, journal, updateAccountContext, trialAI, connectedProvider]);
  useEffect(()=>{
    if(!liveAIAvailable||trialAI||!activeIdentity||connectedAI)return;
    const key=`${connectedProvider}:${activeIdentity.id}`;
    if(automaticAttempt.current===key)return;
    let consent=null;try{consent=parseLiveConnectionConsent(sessionStorage.getItem(LIVE_CONNECTION_KEY));}catch{}
    const requested=pendingLiveIdentity===activeIdentity.id;
    if(!requested&&(!consent||consent.identityId!==activeIdentity.id||consent.provider!==connectedProvider))return;
    let current=true;
    void Promise.resolve().then(async()=>{
      if(!current)return;automaticAttempt.current=key;
      if(!requested){const session=await backendRequest<{user:{id:string}|null}>("/api/auth/session");if(!current||session.user?.id!==consent?.userId)return;}
      if(!current)return;
      await connectAI();
    }).catch(error=>{if(current)setConnectionError(error instanceof Error?error.message:"Live connection could not be restored.");});
    return()=>{current=false;};
  },[liveAIAvailable,trialAI,activeIdentity,connectedAI,pendingLiveIdentity,connectedProvider,connectAI]);
  const disconnectAI = useCallback(async () => {
    try{sessionStorage.removeItem(LIVE_CONNECTION_KEY);}catch{}
    setPendingLiveIdentity(null);
    cancelReplies(); setConnectedAI(false);
    await updateAccountContext({}, "DELETE");
    attempts.current.clear();
    setConnectionError("");
    setThreads({});
  }, [cancelReplies, updateAccountContext]);
  const loadPastConversation = useCallback(async (id: string) => {
    if (!connectedAI || !identityVersions.some((identity) => identity.id === id && identity.status === "past")) return;
    const epoch = connectionEpoch.current;
    try { const history = await backendRequest<{ messages: ConversationMessage[] }>(`/api/conversations/${encodeURIComponent(id)}`);
      if (epoch === connectionEpoch.current) setThreads((current) => ({ ...current, [id]: { draft: "", typing: false, messages: history.messages } }));
    } catch (error) { if (epoch === connectionEpoch.current) setConnectionError(error instanceof Error ? error.message : "Earlier conversation could not be loaded."); }
  }, [connectedAI, identityVersions]);
  const restoreConnectedJournal = useCallback(async (snapshot: JournalSnapshot) => {
    cancelReplies();
    if (connectedAI) await disconnectAI();
    await journal.restore(snapshot);
  }, [cancelReplies, connectedAI, disconnectAI, journal]);

  useEffect(() => {
    if (!connectedAI || !activeIdentity) return;
    let current = true;
    void updateAccountContext(contextSyncPayload(activeIdentity, moments)).catch(() => {
      if (current) { cancelReplies(); setConnectedAI(false); setConnectionError("Memory permissions could not be synchronized. AI is paused. Reconnect or use Settings to clear shared memory text before continuing."); }
    });
    return () => { current = false; };
  }, [connectedAI, activeIdentity, moments, cancelReplies, updateAccountContext]);

  const createIdentityVersion = useCallback((input: CreateIdentityInput) => {
    const definition = input.definition.trim();
    if (!definition || definition.length > MAX_IDENTITY_LENGTH) return;
    if (connectedAI && activeIdentity) void updateAccountContext({ archiveIdentityId: activeIdentity.id }, "POST").catch(() => setConnectionError("Your local direction changed, but account archiving could not be confirmed. Reconnect your current direction before using AI."));
    cancelReplies();
    setConnectedAI(false);
    const stamp = new Date().toISOString();
    const newJourneyId = `journey-${crypto.randomUUID()}`;
    setIdentityVersions((current) => {
      const previous = current.find((identity) => identity.status === "active");
      const journeyId = input.newJourney ? newJourneyId : previous?.journeyId ?? newJourneyId;
      const version = Math.max(0, ...current.filter((identity) => identity.journeyId === journeyId).map((identity) => identity.version)) + 1;
      return [
        ...current.map((identity) => identity.status === "active" ? { ...identity, status: "past" as const, supersededAt: stamp } : identity),
        { id: `${journeyId}-v${version}`, journeyId, version, status: "active", definition,
          horizon: input.horizon, reason: input.reason?.trim() || undefined,
          anchor: input.anchor?.trim() || undefined, principles: input.principles ?? [], createdAt: stamp },
      ];
    });
    if(input.connectLiveAI)setPendingLiveIdentity(journal.getSnapshot().snapshot.identityVersions.find(identity=>identity.status==="active")?.id??null);
  }, [cancelReplies, setIdentityVersions, connectedAI, activeIdentity, updateAccountContext, journal]);

  const editActiveIdentityDefinition = useCallback((definition: string) => {
    if (!activeIdentity || definition.trim() === activeIdentity.definition) return;
    createIdentityVersion({ ...activeIdentity, definition });
  }, [activeIdentity, createIdentityVersion]);

  const archiveActiveIdentity = useCallback(() => {
    if (connectedAI && activeIdentity) void updateAccountContext({ archiveIdentityId: activeIdentity.id }, "POST").catch(() => setConnectionError("Archived on this device. Account archiving could not be confirmed; reconnect and check before using AI."));
    cancelReplies();
    setConnectedAI(false);
    setIdentityVersions((current) => current.map((identity) => identity.status === "active"
      ? { ...identity, status: "past", supersededAt: new Date().toISOString() } : identity));
  }, [cancelReplies, setIdentityVersions, connectedAI, activeIdentity, updateAccountContext]);

  const activateMockIdentity = useCallback(() => {
    setIdentityVersions((current) => current.some((identity) => identity.status === "active") ? current
      : current.map((identity) => identity.id === activeIdentityVersion.id ? { ...identity, status: "active", supersededAt: undefined } : identity));
  }, [setIdentityVersions]);

  const saveJourneyMoment = useCallback((moment: JourneyMoment) => {
    setMoments((current) => keepMoment(current, moment));
  }, [setMoments]);
  const setMomentConsent = useCallback((id: string, words: boolean, note: boolean) => {
    setMoments((current) => current.map((moment) => moment.id === id ? changeMomentConsent(moment, words, note, new Date().toISOString()) : moment));
  }, [setMoments]);
  const deleteMoment = useCallback((id: string) => journal.update((current) => ({ ...current,
    moments: current.moments.filter((m) => m.id !== id), drafts: current.drafts?.filter((d) => d.id !== id),
    books: current.books && Object.fromEntries(Object.entries(current.books).map(([year, book]) => [year, { ...book, order: book.order.filter((key) => key !== id) }])),
    bookDrafts: current.bookDrafts && Object.fromEntries(Object.entries(current.bookDrafts).map(([year, book]) => [year, { ...book, order: book.order.filter((key) => key !== id) }])),
  })), [journal]);
  const setThreadDraft = useCallback((id: string, draft: string) => setThreads((current) => ({
    ...current, [id]: { ...(current[id] ?? emptyThread), draft: draft.slice(0, MAX_MESSAGE_LENGTH) },
  })), []);

  const queueReply = useCallback((id: string, content: string, delay: number, welcome = false) => {
    timers.current.set(id, setTimeout(() => {
      timers.current.delete(id);
      setThreads((current) => {
        const thread = current[id] ?? emptyThread;
        return { ...current, [id]: { ...thread, typing: false, messages: [...thread.messages,
          { id: `${welcome ? "welcome-" : ""}${crypto.randomUUID()}`, role: "assistant", content, createdAt: new Date().toISOString() }] } };
      });
    }, delay));
  }, []);

  const ensureGreeting = useCallback((id: string) => {
    if (connectedAI || activeIdentity?.id !== id || threads[id]?.messages.length || timers.current.has(id)) return;
    setThreads((current) => ({ ...current, [id]: { ...(current[id] ?? emptyThread), typing: true } }));
    queueReply(id, firstMessage(activeIdentity), 900, true);
  }, [activeIdentity, threads, queueReply, connectedAI]);

  const sendMessage = useCallback((id: string, raw: string) => {
    const content = raw.trim();
    if (activeIdentity?.id !== id || !content || content.length > MAX_MESSAGE_LENGTH || timers.current.has(id) || requests.current.has(id)) return;
    if (liveAIAvailable && !connectedAI && !trialAI) { setConnectionError("Open Your Space → Settings, sign in, then explicitly connect this direction to live AI. No sample reply was sent."); return; }
    const previousAttempt = connectedAI || trialAI ? attempts.current.get(id) : undefined;
    const retrying = previousAttempt?.content === content;
    setThreads((current) => {
      const thread = current[id] ?? emptyThread;
      return { ...current, [id]: { draft: "", typing: true, messages: retrying ? thread.messages : [...thread.messages,
        { id: crypto.randomUUID(), role: "user", content, createdAt: new Date().toISOString() }] } };
    });
    if (!connectedAI && !trialAI) { queueReply(id, previewReply(content), 1100); return; }
    requests.current.add(id); setConnectionError("");
    const requestId = retrying ? previousAttempt.requestId : crypto.randomUUID();
    attempts.current.set(id, { content, requestId });
    const epoch = connectionEpoch.current;
    void (async () => {
      try {
        if (trialAI) {
          const history = threads[id]?.messages ?? [];
          const result = await backendRequest<{ message: ConversationMessage }>("/api/trial-ai", localReplyPayload(activeIdentity, moments, retrying ? history.slice(0, -1) : history, content), "POST", false, 70000);
          if (epoch !== connectionEpoch.current) return;
          attempts.current.delete(id);
          setThreads((current) => ({ ...current, [id]: { ...current[id], typing: false, messages: [...current[id].messages, result.message] } }));
          return;
        }
        await updateAccountContext(contextSyncPayload(activeIdentity, moments));
        if (epoch !== connectionEpoch.current) return;
        const result = await backendRequest<{ message: ConversationMessage }>("/api/ai", { identityId: id, message: content, requestId });
        if (epoch !== connectionEpoch.current) return;
        attempts.current.delete(id);
        setThreads((current) => ({ ...current, [id]: { ...current[id], typing: false, messages: [...current[id].messages, result.message] } }));
      } catch (error) {
        if (epoch !== connectionEpoch.current) return;
        if (!trialAI && error instanceof BackendRequestError && error.code !== "pending_request") attempts.current.set(id,{content,requestId:crypto.randomUUID()});
        setConnectionError(error instanceof Error ? error.message : "Your reply could not arrive.");
        setThreads((current) => ({ ...current, [id]: { ...current[id], typing: false, draft: current[id].draft || content } }));
      } finally { if (epoch === connectionEpoch.current) requests.current.delete(id); }
    })();
  }, [activeIdentity, queueReply, connectedAI, moments, updateAccountContext, trialAI, threads, liveAIAvailable]);

  const value = useMemo(() => ({ trialAI, trialProvider, liveAIAvailable, connectedProvider, connectedAI, connectionError, connectAI, disconnectAI, loadPastConversation, identityVersions, activeIdentity, moments, threads, preferences, updatePreferences,
    journalSnapshot: local.snapshot, updateJournal: journal.update, restoreJournal: restoreConnectedJournal, readRecovery: journal.readRecovery, deleteRecovery: journal.deleteRecovery,
    storageStatus: local.status, storageError: local.error, retryStorage: journal.retry, exportJournal,
    createIdentityVersion, editActiveIdentityDefinition, archiveActiveIdentity, activateMockIdentity,
    saveJourneyMoment, setMomentConsent, deleteMoment, setThreadDraft, sendMessage, ensureGreeting,
  }), [trialAI, trialProvider, liveAIAvailable, connectedProvider, connectedAI, connectionError, connectAI, disconnectAI, loadPastConversation, identityVersions, activeIdentity, moments, threads, preferences, updatePreferences, createIdentityVersion, editActiveIdentityDefinition,
    archiveActiveIdentity, activateMockIdentity, saveJourneyMoment, setMomentConsent, deleteMoment, setThreadDraft, sendMessage, ensureGreeting, local.snapshot, local.status, local.error, journal, exportJournal, restoreConnectedJournal]);

  if (!local.ready) return <main style={{ minHeight: "100dvh", background: "#0b0b10", color: "#eeeaf5", padding: "12vh 24px" }}><h1>Future Echo</h1>{local.status === "error" ? <><p role="alert">{local.error}</p><p>Your existing local journal has not been replaced.</p><button onClick={journal.retry}>Retry opening journal</button></> : <p role="status">Opening your local journal…</p>}</main>;
  return <MockProductState.Provider value={value}><div data-echo-reading={preferences.readingSize} data-echo-motion={preferences.motion}>{children}</div></MockProductState.Provider>;
}

export function useMockProductState() {
  const context = useContext(MockProductState);
  if (!context) throw new Error("useMockProductState must be used inside MockProductStateProvider");
  return context;
}
