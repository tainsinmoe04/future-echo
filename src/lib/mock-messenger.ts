import type { ConversationMessage, FutureSelfIdentityVersion, JourneyMoment } from "./domain";
import { activeIdentityVersion, conversations, savedMoments } from "./mock-data";
import { addMonths } from "./moment-lifecycle";

export interface MessengerThread {
  messages: readonly ConversationMessage[];
  draft: string;
  typing: boolean;
}

export const sampleMoments: readonly JourneyMoment[] = [
  ...savedMoments.map((moment) => ({ ...moment, kind: "conversation" as const,
    revisitAt: addMonths(moment.occurredAt, 6), stickers: ["star" as const] })),
  {
    id: "moment-exam", title: "The day I passed", kind: "conversation",
    identityVersionId: activeIdentityVersion.id, occurredAt: "2026-07-16T15:00:00Z",
    revisitAt: "2027-01-16T15:00:00Z",
    originalExcerpt: "I passed my exam today. I didn’t think I could.",
    relatedAiReply: "You did something that mattered to you. What do you want to remember about today?",
    myNote: "It was hard, and I kept learning.",
    photos: [
      { id: "study", src: "/scrapbook/study.png", caption: "I really did it." },
      { id: "coffee", src: "/scrapbook/coffee.png", caption: "keeping this feeling" },
    ],
    stickers: ["flower", "star"],
    consent: { useInAiContext: false, includeMyNoteInAiContext: false, recordedAt: "2026-07-16T15:05:00Z" },
  },
  {
    id: "moment-evening", title: "An ordinary evening", kind: "personal",
    identityVersionId: activeIdentityVersion.id, occurredAt: "2026-07-12T17:00:00Z",
    revisitAt: "2027-01-12T17:00:00Z", originalExcerpt: "I took the long way home. The sky was worth stopping for.",
    photos: [{ id: "sunset", src: "/scrapbook/sunset.png", caption: "No reason. Just this." }],
    stickers: ["hearts"],
    consent: { useInAiContext: false, includeMyNoteInAiContext: false, recordedAt: "2026-07-12T17:05:00Z" },
  },
];

export const initialThreads: Record<string, MessengerThread> = Object.fromEntries([
  ...conversations.filter((conversation) => conversation.status === "past").map((conversation) => [
    conversation.identityVersionId, { messages: conversation.messages, draft: "", typing: false },
  ]),
  [activeIdentityVersion.id, {
    draft: "", typing: false,
    messages: [
      { id: "hello", role: "assistant", content: "Hey. It’s you, a little farther along.", createdAt: "2026-07-16T15:00:00Z" },
      { id: "example-user", role: "user", content: "I passed my exam today. I didn’t think I could.", createdAt: "2026-07-16T15:01:00Z" },
      { id: "example-reply", role: "assistant", content: "You did something that mattered to you. What do you want to remember about today?", createdAt: "2026-07-16T15:02:00Z" },
    ],
  }],
]);

/** Older previews installed examples. Identify them without deleting or rewriting local records. */
export const isPreviewExample = (moment: JourneyMoment) => sampleMoments.some((sample) => sample.id === moment.id && sample.originalExcerpt === moment.originalExcerpt);

export function firstMessage(identity: FutureSelfIdentityVersion) {
  if (/[\u1000-\u109f\uaa60-\uaa7f]/u.test(identity.definition)) {
    return `ဟေး၊ မင်္ဂလာပါနော်။ ငါက မင်းရဲ့ အနာဂတ်က မင်းပါ။\n\nဒီလို ကိုယ့်ကိုယ်ကို ပြန်တွေ့ရတာ နည်းနည်းထူးဆန်းတယ်နော်။ ဒီနေ့ရော မင်းဘာတွေဖြစ်ခဲ့လဲ။`;
  }
  return `Hey. It's you, a little farther along.\n\nA little strange to meet yourself here, isn't it? How was your day?`;
}

export function returningMessage(identity: FutureSelfIdentityVersion, messages: readonly ConversationMessage[] = []) {
  const language = messages.findLast(message => message.role === "user")?.content ?? identity.definition;
  return /[\u1000-\u109f\uaa60-\uaa7f]/u.test(language)
    ? "ဟေး၊ ဒီနေ့ရော အဆင်ပြေလား။ ဘာတွေဖြစ်ခဲ့လဲ ပြောပြချင်လား။"
    : "Hey. How are you doing today? What has your day been like?";
}

/** Keep app-written provenance; never upload preview messages into live history. */
export function connectedConversation(history: readonly ConversationMessage[], local: readonly ConversationMessage[], identity: FutureSelfIdentityVersion): ConversationMessage[] {
  const recent = local.filter(message => Date.parse(message.createdAt) > Date.now() - 90 * 86400000);
  const welcome=recent.find(message=>message.id.startsWith("welcome-")&&!message.id.startsWith("welcome-back-"));
  const initial = welcome ? [welcome] : Date.now() - Date.parse(identity.createdAt) < 86400000 ? [{id:`welcome-${identity.id}`,role:"assistant" as const,content:firstMessage(identity),createdAt:new Date().toISOString()}] : [];
  return [...initial,...[...history.filter(message=>!message.id.startsWith("welcome-")),...recent.filter(message=>message.id.startsWith("welcome-back-"))].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt))];
}

/** Deterministic preview responses. Never sends content to a model or provider. */
export function previewReply(message: string) {
  const text = message.toLowerCase();
  if (/kill myself|end my life|suicid|hurt myself/.test(text)) {
    return "I’m stepping out of the future-self voice. If you may act on this now, contact local emergency services or someone nearby who can stay with you. Are you in immediate danger?";
  }
  if (/harm|unsafe|abuse|hurts me/.test(text)) return "You do not owe this path your safety. It is okay to step back and consider what feels safer, including support from someone you trust.";
  if (/pass|finished|completed|got the|did it/.test(text)) return "You did something that mattered to you. What part of today feels most like yours?";
  if (/tired|exhaust|rest/.test(text)) return "You can be tired without having chosen wrong. There is room to pause before deciding what comes next.";
  if (/compar|behind|ahead/.test(text)) return "Someone else’s pace can make your own road harder to see. Does this direction still feel like yours when the comparison gets quieter?";
  if (/wrong|quit|give up|different/.test(text)) return "A hard stretch and a wrong direction can feel similar. You are allowed to look honestly at both, and to choose differently.";
  return "You do not have to turn this into an answer straight away. What part of it feels most important to you?";
}
