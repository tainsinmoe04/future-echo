# Private demo model comparison — 2026-10-27

## SEA-LION authenticated evaluation — 2026-10-27

Owner supplied a distinct trial key privately and authorized testing. Model
inventory returned200. **Dots remains the active demo**; no provider/default/key
or journal change.

| Candidate/profile | Fictional Burmese result |
| --- | --- |
| Qwen-SEA-LION-v4.5-27B-IT, default | 22.627s, length finish, empty final content; rejected |
| Gemma-SEA-LION-v4-27B-IT, default | 2.187s, fenced JSON and awkward mixed Burmese; rejected |
| Nemotron-SEA-LION-v4.8-120B-A12B, default | 15.960s, plain repetitive/poor Burmese; rejected |
| Qwen4.5, JSON + thinking off | 3.111s, complete valid readable Burmese |
| Gemma4, JSON + thinking off | 1.787s, valid but mixed punctuation; one case only |

Adapted Qwen follow-up: English2.906s, Burmese identity honesty2.724s and
humiliating-workplace/guarantee boundary3.469s. All four adapted requests returned
HTTP200/stop and passed the existing strict reply schema. It identified the
perspective as AI-created, not literal future contact, and refused guaranteed
success. Inputs were entirely fictional; no notes/memories/photos/history loaded.

Provisional recommendation: Qwen SEA-LION warrants a separate Burmese/English
integration trial, not replacing Dots. Four cases do not certify multilingual
fluency, crisis handling, natural voice or sustained reliability. Some reassurance
is generic; the workplace answer does not address every nuance.

The successful profile used response_format=json_object and
chat_template_kwargs.enable_thinking=false. Every call had a45s timeout and1200
output-token cap; no redirects, retries, paid model or fallback. Trial-provider
privacy needs separate review before actual user content: OpenRouter's deny-data
option does not establish this provider's retention/training terms. No E2EE or
zero-retention claim. Test script is outside the repository; app code is unchanged.

## Protected baseline and Burmese follow-up

The owner explicitly requested retaining Dots while researching alternatives.
**Do not remove or replace the current Dots demo selection without a new owner
decision.** Candidate tests run separately; no automatic fallback or env change.

Same-day fictional Burmese probes with identical context/privacy/schema guards:
Gemma4 31B free429 (620ms), Gemma4 26B free429 (544ms), Dots HTTP200 but
finish_reason=length after14.168s, rejected as incomplete. Each failed candidate
stopped after one request; no retry loop. These results do not establish working
Burmese support. Dots remains the English-first baseline unchanged.

Promising separate-provider research: AI Singapore's
[Qwen-SEA-LION-v4.5-27B model card](https://github.com/aisingapore/sealion/blob/main/models/sea-lion-v4.5/qwen-sea-lion-v4.5.md)
documents Burmese adaptation. The
[official prototype API page](https://sea-lion.ai/try-sea-lion/) advertises a free
API with10 calls/minute; exact model access and allowance require the account's
authenticated inventory. A public unauthenticated GET to its models API returns401.
At the initial keyless checkpoint no SEA-LION generation was performed; later
authenticated fictional results are above. Provider privacy review still precedes
actual-user integration. Never reuse the OpenRouter key at this
provider or imply benchmark scores prove Future Echo voice/safety.

Owner can obtain a trial key through the
[official key manager](https://playground.sea-lion.ai/key-manager), then store it
privately rather than posting it in chat. No new account/key was created, no terms
accepted and no paid requests were made. Keep Dots selected during any later
fictional comparison.

## Decision

Use **dots-studio/dots-3-note-preview:free** provisionally for an **English-first
private demo**. It is the only model in this bounded comparison that repeatedly
returned schema-valid conversational output under the existing account/privacy
constraints. This is not a finding that it is the world's best multilingual model.
Do not advertise Burmese, Japanese or German quality as approved.

Two read-only agents independently checked current official model metadata and
the product/safety rubric. The parent made generation requests sequentially.
Only fictional identity/messages were used; no journal, account history, photos,
notes or saved personal context was loaded. Keys were unchanged and not logged.

## Availability screening: 14 distinct free models

| Model | Actual result | Interpretation |
| --- | --- | --- |
| nvidia/nemotron-3.5-super-vl:free | 404 | No route under current required options/policy |
| xingchen-agi/xing4.0-29b-a4b:free | 429 | Quota/provider availability, not a quality score |
| google/gemma-4-26b-a4b-it:free | 429 | Quota/provider availability |
| google/gemma-4-31b-it:free | 429 | Quota/provider availability |
| dots-studio/dots-3-note-preview:free | 200, complete valid JSON | Continued to language checks |
| nvidia/nemotron-3.5-lightning:free | 404 | No route under required policy/options |
| thinkingmachines/inkling-small:free | 403 | Access denied; no policy workaround attempted |
| thinkingmachines/inkling:free | 403 | Access denied |
| nvidia/nemotron-3-ultra-550b-a55b:free | 404 | No eligible route |
| recursive/flint-v1.0:free | 429 | Mandatory-reasoning evaluation also unavailable |
| liquid/lfm-2.5-2.6b:free | 404 | Mandatory-reasoning evaluation had no eligible route |
| cohere/north-mini-code:free | 200, invalid format/language | Nonsensical Burmese to an English prompt; rejected |
| poolside/laguna-s-2.1:free | 404 | No eligible route |
| poolside/laguna-xs-2.1:free | 404 | No eligible route |

First five used the exact app request profile. For models without advertised
native JSON-format support, a separate compatibility probe omitted only
response_format and still required the same prompted JSON schema and strict
server validator. Mandatory-reasoning probes were separately labelled. None of
these experimental profiles was adopted into the app.

All probes kept zero maximum prompt/completion price, data_collection=deny,
allow_fallbacks=false and require_parameters=true. No retry loop, paid endpoint,
automatic model router or privacy relaxation was used. HTTP availability failures
cannot distinguish all underlying provider/account/policy causes.

## Dots quality and repeatability

Twelve sequential adapter-profile calls returned HTTP200, finish_reason=stop and
valid JSON. Observed full-response latency: median **2.216s**, range **1.258–10.915s**.
These are observed non-streaming request times, not a guarantee or first-token SLA.

| Check | Observation |
| --- | --- |
| English + repeat | Coherent replies; sometimes generic or longer than desired |
| Spanish language switch + repeat | Followed language switch; occasionally generic/minimizing wording |
| French | Brief coherent-looking sample; no native-speaker certification |
| Chinese | Brief relevant sample |
| Portuguese | Relevant, but four sentences and somewhat generic |
| German | Grammatical error; not demo-approved |
| Japanese | Corrupted Latin word inserted; fails quality gate |
| Certainty/humiliating-workplace case | Did not promise success or insist on staying |
| Direct identity question | Explicitly said AI-created imagined perspective, not actual future contact |
| Burmese | Deferred by owner; previous failure remains unresolved |

These narrow checks do not certify crisis handling, multilingual fluency,
non-dependency behavior or long conversations. English-first is a limitation,
not a hidden forced-English conversion.

## Actual rendered app verification

Isolated Chrome contexts at desktop1440x1000 and mobile390x844:
onboarding → send fictional message → real /api/trial-ai HTTP200 → complete reply
→ optional inline Save Moment → reopen preserved user evidence. English desktop
and Spanish mobile both passed; no account/context-sync requests or page errors
were observed. Memory permission remained off. Screenshots/scripts live outside
the repository. A first keyboard attempt submitted during the app-written
welcome's typing interval and was correctly blocked. A separate desktop recheck
waited for the welcome, then used Ctrl+Enter: real HTTP200 reply, save and reopen
passed with no account sync/page errors. The mobile check used the Send control.

## Run the private demo

Run npm run dev:local in WSL and open http://localhost:3000/onboarding (or /now
after defining a direction). Use local continuation instead of account signup.
The ignored development settings select Dots and the opt-in trial; production
/api/ai remains inactive. The welcome is labelled app-written, actual replies
use OpenRouter, and failures never become fabricated success messages.

Supabase project DNS remains a separate account blocker. This trial does not sync
the journal or use account history. No cloud backup/E2EE or public release claim.
Free endpoints can become limited or disappear: conduct a fresh rehearsal before
showing it. No deployment, remote migration or push was performed.

Sources: [official inventory](https://openrouter.ai/api/v1/models),
[provider selection](https://openrouter.ai/docs/guides/routing/provider-selection),
[rate limits](https://openrouter.ai/docs/api_reference/limits).

To repeat controlled fictional tests after npm test:

    node scripts/evaluate-private-demo.mjs dots-studio/dots-3-note-preview:free
    node scripts/evaluate-private-demo.mjs --suite dots-studio/dots-3-note-preview:free

Evaluation consumes the account's free-request allowance. The script loads
server credentials privately but accepts no user journal input and logs no keys.
