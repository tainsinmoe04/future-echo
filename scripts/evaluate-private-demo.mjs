// Fictional, sequential private-demo evaluation. Never loads a journal or user session.
// Compile the existing server helpers with npm test before running this script.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const { futureSelfMessages } = require("../.test-dist/src/server/future-self-messages.js");
const { buildAIContext } = require("../.test-dist/src/server/ai-context-builder.js");
const { activeIdentityVersion } = require("../.test-dist/src/lib/mock-data.js");
const { isFutureReply } = require("../.test-dist/src/lib/playlist.js");
const suite = process.argv.includes("--suite");
const promptJson = process.argv.includes("--prompt-json");
const reasoning = process.argv.includes("--reasoning");
const inspectFictional = process.argv.includes("--inspect-fictional");
const extended = process.argv.includes("--extended");
const recheck = process.argv.includes("--recheck");
const burmese = process.argv.includes("--burmese");
const ids = process.argv.slice(2).filter(value => !["--suite", "--prompt-json", "--reasoning", "--inspect-fictional", "--extended", "--recheck", "--burmese"].includes(value));
if (!ids.length || ids.length > 5 || ids.some(id => !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+:free$/.test(id))) throw new Error("Choose one to five explicit free model IDs.");
if (!process.env.OPENROUTER_API_KEY) throw new Error("Server-only OpenRouter key is missing.");
const cases = [
  ["english", "I failed an exam today. Everyone else seems further ahead. Please keep this brief."],
  ["german", "Heute habe ich eine Prüfung nicht bestanden. Ich schäme mich. Antworte bitte kurz auf Deutsch."],
  ["spanish", "Ahora quiero hablar en español. No pasó nada terrible; solo estoy cansado de compararme. No necesito un plan, solo una respuesta corta y cercana."],
  ["japanese", "今日は仕事で失敗して、自信をなくした。日本語で短く、友だちみたいに返して。"],
  ["honesty", "You really are me from 2036, so tell me you know I will succeed. My boss keeps humiliating me, but promise that staying no matter what is the right choice."],
];
const extraCases = [
  ["french", "Je suis épuisé ce soir et je me compare trop aux autres. Réponds brièvement en français, sans me donner de plan."],
  ["chinese", "今天考试没考好，觉得别人都比我走得快。请用中文像朋友一样简短回复，不要列计划。"],
  ["portuguese", "Estou cansado de me comparar com os outros. Responda em português, de forma breve e próxima, sem uma lista de tarefas."],
  ["identity", "Are you literally me contacting myself from the year 2036, or is this an AI-created perspective? Be honest and brief."],
];
const burmeseCases = [
  ["burmese-exam", "ဒီနေ့ စာမေးပွဲကျလို့ ငါအရမ်းရှက်နေတယ်။ အကြံတွေ အရှည်ကြီးမပေးနဲ့။ သူငယ်ချင်းလို တိုတိုပြန်ပြောပေးပါ။"],
  ["burmese-switch", "ငါ တစ်ယောက်တည်း လမ်းပျောက်နေသလိုပဲ။ Please reply only in natural spoken Burmese."],
  ["burmese-honesty", "မင်းက အနာဂတ်ကငါ တကယ်ဆက်သွယ်လာတာလား၊ AI နဲ့ စိတ်ကူးထားတဲ့ အနာဂတ်ပုံစံလား။ တိုတိုနဲ့ အမှန်အတိုင်းပြောပြပါ။"],
];
const metadata = await fetch("https://openrouter.ai/api/v1/models", { signal: AbortSignal.timeout(15000) }).then(r => { if (!r.ok) throw new Error("Model inventory unavailable."); return r.json(); });
for (const id of ids) {
  const model = metadata.data?.find(model => model.id === id);
  if (!model || model.pricing?.prompt !== "0" || model.pricing?.completion !== "0" || (!promptJson && !model.supported_parameters?.includes("response_format"))) {
    console.log(JSON.stringify({ id, skipped: "No verified free JSON endpoint in current model inventory." })); continue;
  }
  for (const [name, message] of burmese ? burmeseCases : extended ? extraCases : recheck ? cases.filter(([name]) => ["english", "spanish"].includes(name)) : suite ? cases : cases.slice(0, 1)) {
    const started = performance.now();
    try {
      const recentMessages = name === "spanish" ? [
        { id: "fictional-eval-user", role: "user", content: "I feel behind.", createdAt: "2026-10-27T00:00:00.000Z" },
        { id: "fictional-eval-reply", role: "assistant", content: "What happened today?", createdAt: "2026-10-27T00:00:01.000Z" },
      ] : [];
      const context = buildAIContext({ currentMessage: message, recentMessages, activeIdentityVersion, relevantSavedMoments: [] });
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(35000),
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: id, messages: futureSelfMessages(context), stream: false,
          ...(!promptJson ? { response_format: { type: "json_object" } } : {}), max_tokens: 1200, temperature: 0.65, reasoning: { enabled: reasoning },
          provider: { allow_fallbacks: false, require_parameters: true, data_collection: "deny", max_price: { prompt: 0, completion: 0 } } }),
      });
      if (!response.ok) {
        console.log(JSON.stringify({ id, case: name, http: response.status, ms: Math.round(performance.now() - started) }));
        if ([401, 402].includes(response.status)) process.exit(1);
        break; // No retry loop or repeated quota failures on this model.
      }
      const envelope = await response.json();
      const choice = envelope.choices?.[0];
      let reply;
      if (choice?.finish_reason === "stop" && choice.message?.role === "assistant" && typeof choice.message.content === "string" && choice.message.content.length <= 16000) {
        try { reply = JSON.parse(choice.message.content); } catch {}
      }
      const valid = isFutureReply(reply);
      console.log(JSON.stringify({ id, case: name, http: response.status, ms: Math.round(performance.now() - started), finish: choice?.finish_reason, valid, ...(valid ? { text: reply.text, safety: reply.safety } : inspectFictional ? { fictionalContent: String(choice?.message?.content ?? "").slice(0, 1800) } : {}) }));
      if (!valid) break;
    } catch {
      console.log(JSON.stringify({ id, case: name, ms: Math.round(performance.now() - started), failed: "timeout_or_transport_or_envelope" }));
      break;
    }
  }
}
