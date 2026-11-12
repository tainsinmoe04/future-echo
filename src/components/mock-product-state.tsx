"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ConversationMessage, FutureSelfIdentityVersion, JourneyMoment } from "@/lib/domain";
import { backendRequest, BackendRequestError } from "@/lib/backend-client";
import { contextSyncPayload } from "@/server/context-sync";
import { localReplyPayload } from "@/lib/local-ai-input";
import type { SavedPlaylist } from "@/lib/playlist";
import { activeIdentityVersion } from "@/lib/mock-data";
import { firstMessage, returningMessage, previewReply, connectedConversation, type MessengerThread } from "@/lib/mock-messenger";
import { LIVE_CONNECTION_KEY, parseLiveConnectionConsent } from "@/lib/live-connection";
import { CHAT_RECOVERY_KEY, parseChatRecovery, recoveredThreads } from "@/lib/chat-recovery";
import { changeMomentConsent, keepMoment } from "@/lib/personal-space";
import { DEFAULT_PREFERENCES, type SpacePreferences } from "@/lib/scrapbook";
import { MAX_IDENTITY_LENGTH, MAX_MESSAGE_LENGTH } from "@/lib/redaction";
import { createJournalSession } from "@/lib/journal-session";
import { createJournalStorage } from "@/lib/journal-storage";
import { ACCOUNT_SCOPE_EVENT, ACCOUNT_SCOPE_STORAGE_EVENT, accountStorageSuffix, notifyAccountSessionChanged, readAccountScope } from "@/lib/account-scope";
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
  account: string | null;
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

type ProviderProps = { children: React.ReactNode; trialAI?: boolean; trialProvider?: "SEA-LION" | "OpenRouter"; liveAIAvailable?: boolean; connectedProvider?: "SEA-LION" | "Gemini" };

export function MockProductStateProvider(props: ProviderProps) {
  const pathname = usePathname();
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("google") !== "success") return;
    url.searchParams.delete("google");
    window.history.replaceState(window.history.state, "", url);
    notifyAccountSessionChanged();
  }, [pathname]);
  if (!["/onboarding", "/now", "/memory", "/future-self"].includes(pathname)) return props.children;
  return <PrivateJournalGate {...props} />;
}

function PrivateJournalGate(props: ProviderProps) {
  const router = useRouter();
  const [scope, setScope] = useState<string | null | undefined>(undefined);
  const [verifying, setVerifying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true, sequence = 0;
    function verify(lock: boolean) {
      const generation = ++sequence;
      if (lock) setScope(undefined);
      setVerifying(true);
      setFailed(false);
      void backendRequest<unknown>("/api/auth/session").then(readAccountScope).then((account) => {
        if (active && sequence === generation) { setScope(account); setVerifying(false); }
      }).catch(() => {
        if (active && sequence === generation) { setScope(undefined); setFailed(true); }
      });
    }
    const changed = () => verify(true);
    const storage = (event: StorageEvent) => { if (event.key === ACCOUNT_SCOPE_STORAGE_EVENT) changed(); };
    // Returning from a native file picker must not destroy the editor/upload.
    // Lock its presentation while verifying, and remount only for a new owner.
    const focus = () => { if (document.visibilityState === "visible") verify(false); };
    verify(true);
    window.addEventListener(ACCOUNT_SCOPE_EVENT, changed);
    window.addEventListener("storage", storage);
    window.addEventListener("focus", focus);
    window.addEventListener("pageshow", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      active = false;
      window.removeEventListener(ACCOUNT_SCOPE_EVENT, changed);
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", focus);
      window.removeEventListener("pageshow", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [retry]);
  if (scope === undefined) return <main style={{ minHeight: "100dvh", padding: "12vh 24px" }}><h1>Future Echo</h1>{failed ? <><p role="alert">Your session could not be verified. Local journals remain locked and unchanged.</p><button onClick={() => setRetry(value => value + 1)}>Try again</button><p><button onClick={() => { void backendRequest("/api/auth/logout", {}).then(() => { notifyAccountSessionChanged(); router.push("/login"); }).catch(() => setFailed(true)); }}>Sign out to sign in again</button></p></> : <p role="status">Checking your session…</p>}</main>;
  return <><div className={verifying ? "account-scope-checking" : "account-scope-ready"} inert={verifying} aria-hidden={verifying || undefined}>
    <ScopedProductStateProvider key={accountStorageSuffix(scope)} account={scope} {...props} />
  </div>{verifying && <p className="account-scope-status" role="status">Checking your session…</p>}</>;
}

function ScopedProductStateProvider({ children, account, trialAI = false, trialProvider = "OpenRouter", liveAIAvailable = false, connectedProvider = "Gemini" }: ProviderProps & { account: string | null }) {
  const suffix = accountStorageSuffix(account);
  const recoveryKey = `${CHAT_RECOVERY_KEY}:${suffix}`;
  const consentKey = `${LIVE_CONNECTION_KEY}:${suffix}`;
  const [journal] = useState(() => createJournalSession(initialJournal, createJournalStorage(`future-echo-journal-v2:${suffix}`)));
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
  const [threads, publishThreads] = useState<Record<string, MessengerThread>>({});
  const threadsRef = useRef<Record<string, MessengerThread>>({});
  const recoveryOwner = useRef<string | null>(account);
  const recoveryWritable = useRef(false);
  const recoveryRevision = useRef<string | null>(null);
  const returning = useRef(false);
  const retentionDays = useRef<30 | 90>(30);
  const [chatReady, setChatReady] = useState(false);
  const [chatStorageError, setChatStorageError] = useState("");
  const [connectedAI, setConnectedAI] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [pendingLiveIdentity,setPendingLiveIdentity]=useState<string|null>(null);
  const automaticAttempt=useRef("");
  const connectionEpoch = useRef(0);
  const connectionFlight = useRef<{ id: string; promise: Promise<void> } | null>(null);
  const requests = useRef(new Set<string>());
  const attempts = useRef(new Map<string, { content: string; requestId: string }>());
  const setThreads = useCallback((change: Record<string, MessengerThread> | ((current: Record<string, MessengerThread>) => Record<string, MessengerThread>)) => {
    const next = typeof change === "function" ? change(threadsRef.current) : change;
    threadsRef.current = next;
    try {
      if (!recoveryWritable.current) throw new Error("recovery locked");
      if (localStorage.getItem(recoveryKey) !== recoveryRevision.current) throw new Error("Another tab changed this chat; reload before continuing.");
      const bounded = Object.fromEntries(Object.entries(next).slice(-20).map(([key, thread]) => [key, { ...thread, messages: thread.messages.filter(message => Date.parse(message.createdAt) > Date.now() - retentionDays.current * 86400000).slice(-500) }]));
      const value = JSON.stringify({ version: 1, owner: recoveryOwner.current, savedAt: Date.now(), retentionDays: retentionDays.current, threads: bounded, attempts: Object.fromEntries([...attempts.current].filter(([key]) => Object.hasOwn(bounded, key))) });
      if (value.length > 2_000_000) throw new Error("chat capacity");
      localStorage.setItem(recoveryKey, value);
      recoveryRevision.current = value;
      setChatStorageError("");
    } catch { setChatStorageError("Chat could not be saved, or another tab changed it. Keep this tab open and copy unsaved words before reloading."); }
    publishThreads(next);
  }, [recoveryKey]);
  useEffect(() => {
    let current = true;
    void (async () => {
      try {
        const stored = localStorage.getItem(recoveryKey);
        recoveryRevision.current = stored;
        const recovery = parseChatRecovery(stored ?? sessionStorage.getItem(recoveryKey));
        if (recovery && recovery.owner !== account) throw new Error("Chat owner mismatch.");
        if (!current) return;
        recoveryWritable.current = true;
        if (!recovery) { localStorage.removeItem(recoveryKey); sessionStorage.removeItem(recoveryKey); recoveryRevision.current = null; return; }
        returning.current = Date.now() - recovery.savedAt >= 86400000;
        recoveryOwner.current = recovery.owner;
        retentionDays.current = recovery.retentionDays ?? 30;
        attempts.current = new Map(Object.entries(recovery.attempts));
        const restored = recoveredThreads(recovery);
        threadsRef.current = restored;
        setThreads(restored);
        sessionStorage.removeItem(recoveryKey);
        if (Object.values(recovery.threads).some(thread => thread.typing)) setConnectionError("Your interrupted conversation was recovered. Check the latest messages before choosing to send again; no message was automatically resent.");
      } catch { if (current) setChatStorageError("Chat recovery could not be opened. It has not been overwritten; reconnect the same account and reload to try again."); }
      finally { if (current) setChatReady(true); }
    })();
    return () => { current = false; };
  }, [account, recoveryKey, setThreads]);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; connectionEpoch.current += 1; }; }, []);
  const contextQueue = useRef<Promise<unknown>>(Promise.resolve());
  const updateAccountContext = useCallback((body: unknown, method = "PUT") => {
    const pending = contextQueue.current.catch(() => {}).then(() => { if (!account || !mounted.current) throw new Error("Account session changed."); return backendRequest("/api/context", body, method, true, 60000, account); });
    contextQueue.current = pending;
    return pending;
  }, [account]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const activeIdentity = identityVersions.find((identity) => identity.status === "active") ?? null;

  useEffect(() => {
    if (!chatReady) return;
    const prune = () => {
      const cutoff = Date.now() - retentionDays.current * 86400000;
      if (!Object.values(threadsRef.current).some(thread => thread.messages.some(message => Date.parse(message.createdAt) <= cutoff))) return;
      setThreads(current => Object.fromEntries(Object.entries(current).map(([key, thread]) => [key, { ...thread, messages: thread.messages.filter(message => Date.parse(message.createdAt) > cutoff) }])));
    };
    const timer = setInterval(prune, 60000);
    window.addEventListener("focus", prune);
    return () => { clearInterval(timer); window.removeEventListener("focus", prune); };
  }, [chatReady, setThreads]);

  useEffect(() => {
    const pending = timers.current;
    return () => { pending.forEach(clearTimeout); pending.clear(); };
  }, []);

  const cancelReplies = useCallback(() => {
    connectionEpoch.current += 1;
    requests.current.clear();
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    setThreads((current) => Object.fromEntries(Object.entries(current).map(([id, thread]) => [id, { ...thread, typing: false,
      draft: thread.draft || (thread.typing ? attempts.current.get(id)?.content ?? thread.messages.findLast(message => message.role === "user")?.content ?? "" : ""),
    }])));
  }, [setThreads]);

  const establishConnection = useCallback(async () => {
    if (trialAI) throw new Error("The private trial does not connect to cloud accounts.");
    if (!activeIdentity) throw new Error("Choose a direction first.");
    cancelReplies();
    const epoch = connectionEpoch.current;
    const session=await backendRequest<{user:{id:string}|null}>("/api/auth/session");
    if (!account || session.user?.id !== account) throw new Error("Sign in with the active account to continue.");
    if(epoch!==connectionEpoch.current) throw new Error("Your direction changed. Connect the current one.");
    if (recoveryOwner.current && recoveryOwner.current !== session.user.id) { attempts.current.clear(); setThreads({}); }
    recoveryOwner.current = session.user.id;
    recoveryWritable.current = true;
    try{localStorage.setItem(consentKey,JSON.stringify({identityId:activeIdentity.id,userId:session.user.id,provider:connectedProvider}));}catch{/* A browser without storage can still explicitly connect. */}
    await backendRequest("/api/auth/attest-adult",{adultConfirmed:true}, "POST", true, 60000, account);
    await updateAccountContext(contextSyncPayload(activeIdentity, moments));
    const [history, saved] = await Promise.all([
      backendRequest<{ messages: ConversationMessage[]; retentionDays?: 30 | 90 }>(`/api/conversations/${encodeURIComponent(activeIdentity.id)}`, undefined, "GET", true, 60000, account),
      backendRequest<{ playlists: SavedPlaylist[] }>("/api/playlists", undefined, "GET", true, 60000, account),
    ]);
    if (epoch !== connectionEpoch.current) {
      throw new Error("Your direction changed. Connect it again when ready.");
    }
    const interrupted = attempts.current.get(activeIdentity.id);
    retentionDays.current = history.retentionDays === 90 ? 90 : 30;
    const completed = interrupted && history.messages.some(message => message.id === interrupted.requestId && message.role === "assistant");
    setThreads((current) => {
      const thread = current[activeIdentity.id];
      const messages = connectedConversation(history.messages, thread?.messages ?? [], activeIdentity);
      const pendingUser = interrupted && !completed ? thread?.messages.findLast(message => message.role === "user" && message.content === interrupted.content) : undefined;
      if (pendingUser) messages.push(pendingUser);
      return { ...current, [activeIdentity.id]: { draft: completed && thread?.draft === interrupted?.content ? "" : thread?.draft ?? "", typing: false, messages } };
    });
    journal.update((current) => ({ ...current, playlists: [...(current.playlists ?? []).filter((p) => !saved.playlists.some((s) => s.id === p.id)), ...saved.playlists.filter((p) => current.identityVersions.some((i) => i.id === p.identityVersionId))] }));
    if (completed || !interrupted) attempts.current.delete(activeIdentity.id);
    setConnectionError(""); setConnectedAI(true);
  }, [account, consentKey, activeIdentity, moments, cancelReplies, journal, updateAccountContext, trialAI, connectedProvider, setThreads]);
  const connectAI = useCallback(() => {
    const id = `${connectedProvider}:${activeIdentity?.id ?? "none"}`;
    if (connectionFlight.current?.id === id) return connectionFlight.current.promise;
    const promise = establishConnection().finally(() => {
      if (connectionFlight.current?.promise === promise) connectionFlight.current = null;
    });
    connectionFlight.current = { id, promise };
    return promise;
  }, [activeIdentity?.id, connectedProvider, establishConnection]);
  useEffect(()=>{
    if(!chatReady||!liveAIAvailable||trialAI||!activeIdentity||connectedAI)return;
    const key=`${connectedProvider}:${activeIdentity.id}`;
    if(automaticAttempt.current===key)return;
    let consent=null;try{consent=parseLiveConnectionConsent(localStorage.getItem(consentKey) ?? sessionStorage.getItem(consentKey));}catch{}
    let accountStart=false;try{accountStart=sessionStorage.getItem("future-echo-account-start")==="yes";}catch{}
    const requested=pendingLiveIdentity===activeIdentity.id||accountStart;
    if(!requested&&(!consent||consent.identityId!==activeIdentity.id||consent.provider!==connectedProvider))return;
    let current=true;
    void Promise.resolve().then(async()=>{
      if(!current)return;automaticAttempt.current=key;
      if(!requested){const session=await backendRequest<{user:{id:string}|null}>("/api/auth/session");if(!current||session.user?.id!==consent?.userId)return;}
      if(!current)return;
      await connectAI();
      try{sessionStorage.removeItem("future-echo-account-start");}catch{}
    }).catch(error=>{if(current)setConnectionError(error instanceof Error?error.message:"Live connection could not be restored.");});
    return()=>{current=false;};
  },[chatReady,liveAIAvailable,trialAI,activeIdentity,connectedAI,pendingLiveIdentity,connectedProvider,connectAI,consentKey]);
  const disconnectAI = useCallback(async () => {
    try{sessionStorage.removeItem(consentKey);localStorage.removeItem(consentKey);}catch{}
    setPendingLiveIdentity(null);
    cancelReplies(); setConnectedAI(false);
    attempts.current.clear();
    recoveryOwner.current = account;
    setConnectionError("");
    setThreads({});
    try { sessionStorage.removeItem(recoveryKey); localStorage.removeItem(recoveryKey); recoveryRevision.current = null; } catch {}
    await updateAccountContext({}, "DELETE");
  }, [account, consentKey, recoveryKey, cancelReplies, updateAccountContext, setThreads]);
  const loadPastConversation = useCallback(async (id: string) => {
    if (!connectedAI || !identityVersions.some((identity) => identity.id === id && identity.status === "past")) return;
    const epoch = connectionEpoch.current;
    try { const history = await backendRequest<{ messages: ConversationMessage[] }>(`/api/conversations/${encodeURIComponent(id)}`, undefined, "GET", true, 60000, account ?? undefined);
      if (epoch === connectionEpoch.current) setThreads((current) => ({ ...current, [id]: { draft: "", typing: false, messages: history.messages } }));
    } catch (error) { if (epoch === connectionEpoch.current) setConnectionError(error instanceof Error ? error.message : "Earlier conversation could not be loaded."); }
  }, [account, connectedAI, identityVersions, setThreads]);
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
  })), [setThreads]);

  const queueReply = useCallback((id: string, content: string, delay: number, welcome = false) => {
    timers.current.set(id, setTimeout(() => {
      timers.current.delete(id);
      setThreads((current) => {
        const thread = current[id] ?? emptyThread;
        return { ...current, [id]: { ...thread, typing: false, messages: [...thread.messages,
          { id: `${welcome ? "welcome-" : ""}${crypto.randomUUID()}`, role: "assistant", content, createdAt: new Date().toISOString() }] } };
      });
    }, delay));
  }, [setThreads]);

  const ensureGreeting = useCallback((id: string) => {
    if (activeIdentity?.id !== id || timers.current.has(id)) return;
    if (returning.current || (!threads[id]?.messages.length && Date.now() - Date.parse(activeIdentity.createdAt) >= 86400000)) {
      returning.current = false;
      const thread = threadsRef.current[id] ?? emptyThread;
      setThreads(current => ({ ...current, [id]: { ...thread, messages: [...thread.messages, { id: `welcome-back-${crypto.randomUUID()}`, role: "assistant", content: returningMessage(activeIdentity, thread.messages), createdAt: new Date().toISOString() }] } }));
      return;
    }
    if (connectedAI || threads[id]?.messages.length) return;
    setThreads((current) => ({ ...current, [id]: { ...(current[id] ?? emptyThread), typing: true } }));
    queueReply(id, firstMessage(activeIdentity), 900, true);
  }, [activeIdentity, threads, queueReply, connectedAI, setThreads]);

  const sendMessage = useCallback((id: string, raw: string) => {
    const content = raw.trim();
    if (activeIdentity?.id !== id || !content || content.length > MAX_MESSAGE_LENGTH || timers.current.has(id) || requests.current.has(id)) return;
    if (liveAIAvailable && !connectedAI && !trialAI) { setConnectionError("Open Your Space → Settings, sign in, then explicitly connect this direction to live AI. No sample reply was sent."); return; }
    const previousAttempt = connectedAI || trialAI ? attempts.current.get(id) : undefined;
    const lastMessage = threadsRef.current[id]?.messages.at(-1);
    const retrying = previousAttempt?.content === content;
    const reusePreviewUser = !connectedAI && !trialAI && lastMessage?.role === "user" && lastMessage.content === content;
    const requestId = retrying ? previousAttempt.requestId : crypto.randomUUID();
    if (connectedAI || trialAI) attempts.current.set(id, { content, requestId });
    setThreads((current) => {
      const thread = current[id] ?? emptyThread;
      return { ...current, [id]: { draft: "", typing: true, messages: retrying || reusePreviewUser ? thread.messages : [...thread.messages,
        { id: crypto.randomUUID(), role: "user", content, createdAt: new Date().toISOString() }] } };
    });
    if (!connectedAI && !trialAI) { queueReply(id, previewReply(content), 1100); return; }
    requests.current.add(id); setConnectionError("");
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
        const result = await backendRequest<{ message: ConversationMessage }>("/api/ai", { identityId: id, message: content, requestId }, "POST", true, 60000, account ?? undefined);
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
  }, [account, activeIdentity, queueReply, connectedAI, moments, updateAccountContext, trialAI, threads, liveAIAvailable, setThreads]);

  const value = useMemo(() => ({ account, trialAI, trialProvider, liveAIAvailable, connectedProvider, connectedAI, connectionError: chatStorageError || connectionError, connectAI, disconnectAI, loadPastConversation, identityVersions, activeIdentity, moments, threads, preferences, updatePreferences,
    journalSnapshot: local.snapshot, updateJournal: journal.update, restoreJournal: restoreConnectedJournal, readRecovery: journal.readRecovery, deleteRecovery: journal.deleteRecovery,
    storageStatus: local.status, storageError: local.error, retryStorage: journal.retry, exportJournal,
    createIdentityVersion, editActiveIdentityDefinition, archiveActiveIdentity, activateMockIdentity,
    saveJourneyMoment, setMomentConsent, deleteMoment, setThreadDraft, sendMessage, ensureGreeting,
  }), [account, trialAI, trialProvider, liveAIAvailable, connectedProvider, connectedAI, connectionError, chatStorageError, connectAI, disconnectAI, loadPastConversation, identityVersions, activeIdentity, moments, threads, preferences, updatePreferences, createIdentityVersion, editActiveIdentityDefinition,
    archiveActiveIdentity, activateMockIdentity, saveJourneyMoment, setMomentConsent, deleteMoment, setThreadDraft, sendMessage, ensureGreeting, local.snapshot, local.status, local.error, journal, exportJournal, restoreConnectedJournal]);

  if (!local.ready || !chatReady) return <main style={{ minHeight: "100dvh", background: "#0b0b10", color: "#eeeaf5", padding: "12vh 24px" }}><h1>Future Echo</h1>{local.status === "error" ? <><p role="alert">{local.error}</p><p>Your existing local journal has not been replaced.</p><button onClick={journal.retry}>Retry opening journal</button></> : <p role="status">Opening your local journal…</p>}</main>;
  return <MockProductState.Provider value={value}><div data-echo-reading={preferences.readingSize} data-echo-motion={preferences.motion}>{children}</div></MockProductState.Provider>;
}

export function useMockProductState() {
  const context = useContext(MockProductState);
  if (!context) throw new Error("useMockProductState must be used inside MockProductStateProvider");
  return context;
}
