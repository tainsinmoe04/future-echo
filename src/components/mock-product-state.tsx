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
import { hydrateAccountJournal, type AccountHydration } from "@/lib/account-hydration";
import { serializeJournalBackup } from "@/lib/journal-backup";
import type { JournalSnapshot } from "@/lib/journal-snapshot";
import {
  cloudJournalPayload, isBlankJournal, mergeJournalCloud,
  type JournalCloudDocument, type JournalSyncState,
} from "@/lib/journal-sync";
import { myanmarVariables } from "@/app/myanmar-fonts";

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
  journalSync: JournalSyncState;
  accountHydrated: boolean;
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
/** Focused slices: consumers subscribe only to the state they actually read. */
type JournalSlice = Pick<MockProductStateValue,
  "journalSnapshot" | "updateJournal" | "restoreJournal" | "readRecovery" | "deleteRecovery" |
  "storageStatus" | "storageError" | "journalSync" | "accountHydrated" | "retryStorage" | "exportJournal" |
  "preferences" | "updatePreferences" | "identityVersions" | "activeIdentity" | "moments" |
  "createIdentityVersion" | "editActiveIdentityDefinition" | "archiveActiveIdentity" | "activateMockIdentity" |
  "saveJourneyMoment" | "setMomentConsent" | "deleteMoment">;
type ChatSlice = Pick<MockProductStateValue, "threads" | "setThreadDraft" | "sendMessage" | "ensureGreeting">;
type ConnectionSlice = Pick<MockProductStateValue,
  "account" | "trialAI" | "trialProvider" | "liveAIAvailable" | "connectedProvider" |
  "connectedAI" | "connectionError" | "connectAI" | "disconnectAI" | "loadPastConversation">;
const JournalState = createContext<JournalSlice | null>(null);
const ChatState = createContext<ChatSlice | null>(null);
const ConnectionState = createContext<ConnectionSlice | null>(null);
function useSlice<T>(context: React.Context<T | null>, name: string): T {
  const value = useContext(context);
  if (!value) throw new Error(`${name} must be used inside MockProductStateProvider`);
  return value;
}
export function useJournalState() { return useSlice(JournalState, "useJournalState"); }
export function useChatState() { return useSlice(ChatState, "useChatState"); }
export function useConnectionState() { return useSlice(ConnectionState, "useConnectionState"); }
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
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true, sequence = 0, checking = false;
    function verify(lock: boolean) {
      // Focus, visibility and pageshow often arrive together after a file picker.
      // Reuse an in-flight check; explicit account changes always supersede it.
      if (!lock && checking) return;
      const generation = ++sequence;
      checking = true;
      if (lock) setScope(undefined);
      setFailed(false);
      void backendRequest<unknown>("/api/auth/session").then(readAccountScope).then((account) => {
        if (active && sequence === generation) { checking = false; setScope(account); }
      }).catch(() => {
        if (active && sequence === generation) { checking = false; setScope(undefined); setFailed(true); }
      });
    }
    const changed = () => verify(true);
    const storage = (event: StorageEvent) => { if (event.key === ACCOUNT_SCOPE_STORAGE_EVENT) changed(); };
    // An ordinary return is a background refresh: retain focus, selection and
    // uploads. Initial/explicit account checks still lock; changed results
    // remount by owner key, and failed verification still fails closed.
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
  if (scope === undefined) return <main className="echo-boot-screen"><h1>Future Echo</h1>{failed ? <><p role="alert">Your session could not be verified. Local journals remain locked and unchanged.</p><button onClick={() => setRetry(value => value + 1)}>Try again</button><p><button onClick={() => { void backendRequest("/api/auth/logout", {}).then(() => { notifyAccountSessionChanged(); router.push("/login"); }).catch(() => setFailed(true)); }}>Sign out to sign in again</button></p></> : <p role="status">Checking your session…</p>}</main>;
  return <div className="account-scope-ready">
    <ScopedProductStateProvider key={accountStorageSuffix(scope)} account={scope} {...props} />
  </div>;
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
  const [accountSyncDone, setAccountSyncDone] = useState(false);
  const hydrationAttempted = useRef(false);
  // A guest scope has no account record to read; a signed-in scope settles once
  // the read below completes (or fails, leaving local records as they are).
  const accountHydrated = accountSyncDone || !account;
  // A second device has an empty local journal but an existing account record.
  // Read the account's Future Self back before any screen decides to show
  // onboarding; failure (offline, unconfigured backend) leaves local records as
  // they are rather than blocking the app.
  useEffect(() => {
    if (!local.ready || !account || hydrationAttempted.current) return;
    hydrationAttempted.current = true;
    // The settled flag is set unconditionally: a re-run of this effect (dev
    // double-invoke) must not leave screens waiting on a check already sent.
    void backendRequest<AccountHydration>("/api/context", undefined, "GET", true, 8000, account)
      .then((remote) => journal.update((snapshot) => hydrateAccountJournal(snapshot, remote) ?? snapshot))
      .catch(() => { /* Offline or unconfigured: this device's records stand. */ })
      .finally(() => setAccountSyncDone(true));
  }, [local.ready, account, journal]);
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
  const chatPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingChatPersist = useRef<(() => void) | null>(null);
  const persistThreads = useCallback(() => {
    pendingChatPersist.current = null;
    try {
      if (!recoveryWritable.current) throw new Error("recovery locked");
      if (localStorage.getItem(recoveryKey) !== recoveryRevision.current) throw new Error("Another tab changed this chat; reload before continuing.");
      const next = threadsRef.current;
      const bounded = Object.fromEntries(Object.entries(next).slice(-20).map(([key, thread]) => [key, { ...thread, messages: thread.messages.filter(message => Date.parse(message.createdAt) > Date.now() - retentionDays.current * 86400000).slice(-500) }]));
      const value = JSON.stringify({ version: 1, owner: recoveryOwner.current, savedAt: Date.now(), retentionDays: retentionDays.current, threads: bounded, attempts: Object.fromEntries([...attempts.current].filter(([key]) => Object.hasOwn(bounded, key))) });
      if (value.length > 2_000_000) throw new Error("chat capacity");
      localStorage.setItem(recoveryKey, value);
      recoveryRevision.current = value;
      setChatStorageError("");
    } catch { setChatStorageError("Chat could not be saved, or another tab changed it. Keep this tab open and copy unsaved words before reloading."); }
  }, [recoveryKey]);
  // Keystrokes update memory immediately; the synchronous localStorage write is
  // coalesced to one trailing save so typing never blocks on stringify + storage.
  const setThreads = useCallback((change: Record<string, MessengerThread> | ((current: Record<string, MessengerThread>) => Record<string, MessengerThread>)) => {
    threadsRef.current = typeof change === "function" ? change(threadsRef.current) : change;
    publishThreads(threadsRef.current);
    pendingChatPersist.current = persistThreads;
    if (chatPersistTimer.current) clearTimeout(chatPersistTimer.current);
    chatPersistTimer.current = setTimeout(() => { chatPersistTimer.current = null; pendingChatPersist.current?.(); }, 400);
  }, [persistThreads]);
  useEffect(() => {
    const flush = () => {
      if (chatPersistTimer.current) { clearTimeout(chatPersistTimer.current); chatPersistTimer.current = null; }
      pendingChatPersist.current?.();
    };
    // Tab closure/reload must never lose the trailing write (chat recovery relies on it).
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("pagehide", flush); flush(); };
  }, []);
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

  // Cross-device journal sync: signed-in accounts mirror saved pages, covers and
  // settings. Guests keep the local-first document; a failed or oversized sync
  // never blocks or rewrites local saving.
  const [journalSync, setJournalSync] = useState<JournalSyncState>(() => ({ status: account ? "pulling" : "local", message: "", lastSyncedAt: "" }));
  const syncControl = useRef({ revision: 0, pushed: "", pulled: false, conflicts: 0, flight: null as Promise<void> | null });
  const [syncTick, setSyncTick] = useState(0);
  const publishSync = useCallback((patch: Partial<JournalSyncState>) => {
    if (mounted.current) setJournalSync((current) => ({ ...current, ...patch }));
  }, []);
  const pullJournal = useCallback((): Promise<void> => {
    if (!account) return Promise.resolve();
    const control = syncControl.current;
    if (control.pulled) return Promise.resolve();
    if (control.flight) return control.flight;
    const flight = (async () => {
      publishSync({ status: "pulling", message: "" });
      try {
        const remote = await backendRequest<{ journal: JournalCloudDocument | null }>("/api/journal", undefined, "GET", true, 20000, account);
        control.revision = remote.journal?.revision ?? 0;
        control.pulled = true;
        control.conflicts = 0;
        const document = remote.journal?.document
          ? { snapshot: remote.journal.document, savedAt: remote.journal.savedAt ?? "" } : null;
        let merged = false;
        if (document) journal.update((current) => {
          const next = mergeJournalCloud({ snapshot: current, savedAt: journal.getSnapshot().savedAt }, document);
          if (!next) return current;
          merged = true;
          return next;
        });
        publishSync({ status: "idle", message: "" });
        // A pull with nothing to merge still leaves local work to publish.
        if (!merged) setSyncTick((tick) => tick + 1);
      } catch {
        control.pulled = false;
        publishSync({ status: "error", message: "" });
      } finally { control.flight = null; }
    })();
    control.flight = flight;
    return flight;
  }, [account, journal, publishSync]);
  const pushJournal = useCallback(async () => {
    if (!account) return;
    const control = syncControl.current;
    if (!control.pulled) { await pullJournal(); return; }
    const local = journal.getSnapshot();
    if (local.status !== "saved") return;
    if (isBlankJournal(local.snapshot)) { publishSync({ status: "idle", message: "" }); return; }
    const payload = cloudJournalPayload(local.snapshot);
    if (!payload) {
      publishSync({ status: "too-large", message: "This journal is over the 4 MB account limit, so nothing was uploaded. It stays on this device." });
      return;
    }
    const encoded = JSON.stringify(payload);
    if (encoded === control.pushed) { publishSync({ status: "synced", message: "" }); return; }
    publishSync({ status: "syncing", message: "" });
    try {
      const saved = await backendRequest<{ revision: number; savedAt: string }>("/api/journal", { document: payload, baseRevision: control.revision }, "PUT", true, 30000, account);
      control.revision = saved.revision;
      control.pushed = encoded;
      control.conflicts = 0;
      publishSync({ status: "synced", message: "", lastSyncedAt: saved.savedAt });
    } catch (error) {
      if (error instanceof BackendRequestError && error.status === 409 && ++control.conflicts <= 3) {
        // Another device wrote first: pull its copy, merge, then publish the union.
        control.pulled = false;
        void pullJournal();
        return;
      }
      publishSync({ status: "error", message: "" });
    }
  }, [account, journal, publishSync, pullJournal]);
  // Local writes publish after a short quiet period so typing does not hammer the network.
  useEffect(() => {
    if (!account || !syncControl.current.pulled || local.status !== "saved") return;
    const timer = setTimeout(() => { void pushJournal(); }, 1500);
    return () => clearTimeout(timer);
  }, [account, local.status, local.savedAt, syncTick, pushJournal]);
  useEffect(() => {
    if (!local.ready || !account || !accountHydrated) return;
    void pullJournal();
  }, [local.ready, account, accountHydrated, pullJournal]);
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
    let consent=null;try{consent=parseLiveConnectionConsent(localStorage.getItem(consentKey) ?? sessionStorage.getItem(consentKey));}catch{if(process.env.NODE_ENV!=="production")console.warn("future-echo: live-connection consent could not be read.");}
    let accountStart=false;try{accountStart=sessionStorage.getItem("future-echo-account-start")==="yes";}catch{if(process.env.NODE_ENV!=="production")console.warn("future-echo: account-start flag could not be read.");}
    const requested=pendingLiveIdentity===activeIdentity.id||accountStart;
    if(!requested&&(!consent||consent.identityId!==activeIdentity.id||consent.provider!==connectedProvider))return;
    let current=true;
    void Promise.resolve().then(async()=>{
      if(!current)return;automaticAttempt.current=key;
      if(!requested){const session=await backendRequest<{user:{id:string}|null}>("/api/auth/session");if(!current||session.user?.id!==consent?.userId)return;}
      if(!current)return;
      await connectAI();
      try{sessionStorage.removeItem("future-echo-account-start");}catch{if(process.env.NODE_ENV!=="production")console.warn("future-echo: account-start flag could not be cleared.");}
    }).catch(error=>{if(current)setConnectionError(error instanceof Error?error.message:"Live connection could not be restored.");});
    return()=>{current=false;};
  },[chatReady,liveAIAvailable,trialAI,activeIdentity,connectedAI,pendingLiveIdentity,connectedProvider,connectAI,consentKey]);
  const disconnectAI = useCallback(async () => {
    try{sessionStorage.removeItem(consentKey);localStorage.removeItem(consentKey);}catch{if(process.env.NODE_ENV!=="production")console.warn("future-echo: connection consent could not be cleared.");}
    setPendingLiveIdentity(null);
    cancelReplies(); setConnectedAI(false);
    attempts.current.clear();
    recoveryOwner.current = account;
    setConnectionError("");
    setThreads({});
    // Drop the trailing debounced write so it cannot resurrect the cleared keys.
    if (chatPersistTimer.current) { clearTimeout(chatPersistTimer.current); chatPersistTimer.current = null; }
    pendingChatPersist.current = null;
    try { sessionStorage.removeItem(recoveryKey); localStorage.removeItem(recoveryKey); recoveryRevision.current = null; } catch { if (process.env.NODE_ENV !== "production") console.warn("future-echo: chat recovery could not be cleared."); }
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
    // The tombstone keeps another device from merging this page back in.
    removals: { ...(current.removals ?? {}), [id]: new Date().toISOString() },
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

  const journalValue = useMemo<JournalSlice>(() => ({
    journalSnapshot: local.snapshot, updateJournal: journal.update, restoreJournal: restoreConnectedJournal,
    readRecovery: journal.readRecovery, deleteRecovery: journal.deleteRecovery,
    storageStatus: local.status, storageError: local.error, journalSync, accountHydrated, retryStorage: journal.retry, exportJournal,
    preferences, updatePreferences, identityVersions, activeIdentity, moments,
    createIdentityVersion, editActiveIdentityDefinition, archiveActiveIdentity, activateMockIdentity,
    saveJourneyMoment, setMomentConsent, deleteMoment,
  }), [local.snapshot, local.status, local.error, journalSync, accountHydrated, journal, restoreConnectedJournal, exportJournal,
    preferences, updatePreferences, identityVersions, activeIdentity, moments,
    createIdentityVersion, editActiveIdentityDefinition, archiveActiveIdentity, activateMockIdentity,
    saveJourneyMoment, setMomentConsent, deleteMoment]);
  const chatValue = useMemo<ChatSlice>(() => ({ threads, setThreadDraft, sendMessage, ensureGreeting }),
    [threads, setThreadDraft, sendMessage, ensureGreeting]);
  const connectionValue = useMemo<ConnectionSlice>(() => ({
    account, trialAI, trialProvider, liveAIAvailable, connectedProvider,
    connectedAI, connectionError: chatStorageError || connectionError, connectAI, disconnectAI, loadPastConversation,
  }), [account, trialAI, trialProvider, liveAIAvailable, connectedProvider, connectedAI,
    chatStorageError, connectionError, connectAI, disconnectAI, loadPastConversation]);
  const value = useMemo(() => ({ ...journalValue, ...chatValue, ...connectionValue }), [journalValue, chatValue, connectionValue]);

  if (!local.ready || !chatReady) return <main className="echo-boot-screen dark"><h1>Future Echo</h1>{local.status === "error" ? <><p role="alert">{local.error}</p><p>Your existing local journal has not been replaced.</p><button onClick={journal.retry}>Retry opening journal</button></> : <p role="status">Opening your local journal…</p>}</main>;
  return <ConnectionState.Provider value={connectionValue}><JournalState.Provider value={journalValue}><ChatState.Provider value={chatValue}><MockProductState.Provider value={value}><div className={myanmarVariables} data-echo-reading={preferences.readingSize} data-echo-motion={preferences.motion}>{children}</div></MockProductState.Provider></ChatState.Provider></JournalState.Provider></ConnectionState.Provider>;
}

export function useMockProductState() {
  const context = useContext(MockProductState);
  if (!context) throw new Error("useMockProductState must be used inside MockProductStateProvider");
  return context;
}
