---
name: skinsense-ai
description: Build SkinSense AI, a small, simple, plain-JavaScript Next.js web app where a user uploads a skin photo and gets a careful, non-diagnostic educational report, powered by the Gemma 4 vision model through Google's hosted API. Use this skill whenever the user mentions SkinSense, a skin-photo or skin-care app, a hackathon health-AI demo, an image-upload-to-report flow, a first-visit guide dialog plus hero page, or wants the UI, API route, safety/triage logic, tests, README, demo script or Vercel/Netlify deployment for this app, even if they don't say "skill" or "SkinSense".
license: MIT
metadata:
  version: "2.0.0"
  category: healthcare-adjacent-ai
  language: javascript
---

# SkinSense AI — Hackathon Build Skill

Build a **small, working, honest** app. A judge should be able to open the link, read a short guide, upload a photo, and see a real model-generated report with clear limits, in under a minute. A reliable core flow always beats extra features.

## 1. What the app does

1. On first load a **guide dialog** explains how to use the app.
2. The **hero** states the purpose in one sentence with one primary button.
3. The user **uploads a photo** of a visible skin concern, picks the body area, optionally ticks a few symptoms, and accepts a consent line.
4. The server sends the image to **Gemma 4** and returns a validated report: what is visible, what it *could* be, simple care steps, general OTC information, and when to see a professional.

The report is **education and triage, never diagnosis**. A photo cannot establish a disease, a cause, cleanliness, or baseline skin tone, and the UI says so. This boundary is the product's credibility, so enforce it in code (section 8), not just in a disclaimer.

## 2. Hackathon playbook

**Priority order** (stop adding when time runs short):
1. Upload → real model call → rendered report works end to end.
2. Red-flag triage and error states behave correctly.
3. Guide dialog, hero and report layout are clean and responsive.
4. Deployed URL with the API key set server-side.
5. README + 90-second demo.

**Cut list** (do not build): login, database, history, charts, i18n, chat UI, camera SDKs, "AI score" gauges, animations, analytics.

**Rough timeline** (scale to the event): scaffold + upload UI (20%) → API route + schema + prompt (25%) → triage + error states (15%) → dialog/hero/report polish (15%) → deploy (10%) → README, tests, demo rehearsal (15%).

**90-second demo script**: open link → guide dialog appears, read step 1–3, click *Start* → hero → upload a synthetic or consented sample photo → report appears → tick a red-flag symptom and re-run to show urgent escalation overriding the model → point to limits and AAD source links → one sentence on privacy (image goes to Google's API, not stored by SkinSense).

**Demo insurance**: record a backup screen capture, keep a pre-tested sample image, set env vars on the host before presenting, and confirm the key's rate limit. Never swap in a hard-coded fake report to rescue a demo; show the retry state instead.

## 3. Stack and structure

Use **Next.js (App Router) in plain JavaScript**. Do not use TypeScript or `.tsx`. Write components as `.js` files containing JSX, and add a `jsconfig.json` with the `@/*` path alias. Use plain CSS (one `globals.css`); no UI framework is needed.

Dependencies: `next`, `react`, `react-dom`, `@google/genai`, `zod`; dev: `vitest`, `eslint`.

```text
app/
  layout.js            # fonts, metadata, <html lang="en">
  page.js              # Navbar, GuideDialog, Hero, Analyzer, Basics, Footer
  globals.css
  api/analyze/route.js # POST, Node.js runtime
components/
  Navbar.js
  GuideDialog.js       # native <dialog>
  Hero.js
  Analyzer.js          # upload, form, consent, state machine
  Report.js            # renders validated result as plain text
  UrgencyBanner.js
  Footer.js
lib/
  gemma.js             # server-only SDK call + JSON repair retry
  schema.js            # Zod schema
  imageCheck.js        # MIME, size, magic bytes
  triage.js            # deterministic red flags
  references.js        # allowlisted source links (app-owned)
  prompt.js
tests/                 # schema, imageCheck, triage
.env.example           # GEMINI_API_KEY=  GEMMA_MODEL=gemma-4-26b-a4b-it
```

Keep one state machine in `Analyzer.js`: `idle → ready → analyzing → result | error`. Each state has an intentional UI.

## 4. Screens and behavior

### Navbar (minimal)
Wordmark `SkinSense` on the left. On the right, two items only: **How it works** (a button that reopens the guide) and **Sources** (anchor to the footer). Add a small text label "Educational tool". No hamburger, no dropdowns, no icons required. Make it sticky only if it stays slim.

### Guide dialog (first thing the user sees)
Use the native `<dialog>` element with `showModal()`: it gives focus trapping, `Esc` to close, and a backdrop for free. Open it on page load once per browser session, remembered with `sessionStorage` key `skinsense:guide-seen` (a UI flag only, never health data). Content, in plain language:

- Title: "How SkinSense works"
- Step 1 — **Take a clear photo**: good light, in focus, no filters, close-up of the skin area; avoid showing your face or identifying details.
- Step 2 — **Add a little context**: choose the body area and tick any symptoms.
- Step 3 — **Read your report**: observations, possibilities, care tips, and when to see a professional.
- One honest line: "Not a diagnosis. Your photo is sent to Google's AI service for analysis and is not saved by SkinSense."
- A single primary button **Start**, plus a close (×) control. Return focus to the page when closed. The navbar "How it works" button reopens it.

### Hero
One `<h1>`: "Understand what your skin may be telling you." One short paragraph: educational observations, not a diagnosis. One primary button, **Upload a photo**, that scrolls to `#analyze`. Nothing else competes with it.

### Analyzer (the functional core)
- Large click/drag upload area built on a real `<input type="file" accept="image/jpeg,image/png,image/webp">` with a visible label, so it works with keyboard and mobile camera/gallery. Show the limits next to it ("JPEG, PNG or WebP, up to 5 MB").
- Preview with **Replace** and **Remove** buttons. Remove clears the preview, form state and any result.
- "What area is this?" `<select>` (face, scalp, neck, arm, hand, torso, leg, foot, other).
- Optional symptom checkboxes: itching, pain, spreading quickly, fever, blistering, swelling of lips/face/throat or trouble breathing, new product or medicine, bleeding, not healing. Optional free-text "How long?" (short, length-limited).
- Consent checkbox, required, in plain words: "I understand this photo is sent to Google's AI service to create my report. SkinSense does not save it."
- Primary button **Analyze photo**, disabled until a valid image and consent exist.
- Downscale large images client-side with a canvas (max ~1280 px longest side, JPEG ~0.85) so uploads stay under host request limits (Vercel's is about 4.5 MB; verify current limits).
- While analyzing, show text-only step labels ("Checking image quality", "Preparing your report"). No fake percentages. Announce completion or errors with `aria-live="polite"`.

### Report
Order: **urgency banner → summary → What the image shows → What this could mean → Care steps → General OTC information → When to see a professional → Limitations → Sources.**
- Render everything as plain text via React; never use `dangerouslySetInnerHTML`.
- Urgency banner uses a word label plus icon plus border, not color alone.
- If image quality is `poor`, show only retake tips and the generic safety notes, with no issue-specific claims.
- Buttons: **Analyze another photo** and **Print / save as PDF** (`window.print()` with a simple print stylesheet).

### Basics section (optional, small)
Three short, plainly worded items: gentle cleansing, moisturizing, sun protection (SPF 30+, broad-spectrum). Each links to the matching AAD page. Write in your own words.

### Footer
Limitations line, privacy line, model name with link, and the source links from `lib/references.js`.

## 5. Visual style: simple, like a public-health education page

Take inspiration from the plain, calm, topic-led feel of the AAD skin-care-basics page (https://www.aad.org/public/everyday-care/skin-care-basics). Do not copy its branding, text, images or exact layout.

- White background, near-black navy text (~#12263a), **one** calm blue or teal accent for links and the primary button. Reserve warm colors for warnings only.
- System font stack, base 17–18px, line-height ~1.6, headings clearly larger and bold, single content column about 720px wide.
- Thin 1px gray dividers instead of cards and shadows. Buttons: solid accent, 4–6px radius, generous padding. Inputs: simple bordered fields.
- Visible focus outlines, WCAG AA contrast, `prefers-reduced-motion` respected, mobile-first and fully usable at 360px width.
- Avoid gradients, glassmorphism, glows, robot art, emoji icons, chatbot bubbles, giant headings and decorative motion. If icons are used, use one consistent line-icon set (Lucide).

## 6. Model and API

- Call **Gemma 4** through Google's hosted API with the official `@google/genai` SDK, **server-side only**, from `app/api/analyze/route.js` with `export const runtime = "nodejs"`.
- Read the model from `GEMMA_MODEL` (default `gemma-4-26b-a4b-it`; `gemma-4-31b-it` is an allowed alternative). Check the official docs for current IDs and image/JSON support before coding: https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api and https://ai.google.dev/gemma/docs/capabilities/vision/image. Do not silently fall back to another model or provider.
- Never expose `GEMINI_API_KEY` in client code, responses, logs, or any `NEXT_PUBLIC_` variable. If it is missing, return a clear setup error.
- Send the image as inline data (no persistent file uploads). Ask for JSON only. Validate with Zod. If parsing or validation fails, retry **once** with a strict repair prompt, then return a calm error. Never guess a report.
- Request flow: client validates → consent → `FormData` POST → server validates (method, MIME, size, magic bytes, field lengths) → model call with timeout → Zod parse → `triage.js` merges deterministic red flags → return minimal JSON → image discarded.
- Do not log image bytes, base64, prompts, symptoms, keys, or raw upstream errors. Map upstream 4xx/429/5xx and timeouts to stable error codes with friendly messages and a Retry button.
- Be accurate about privacy: the image **is transmitted to Google's API**. Never say "local-only" or promise data handling beyond what current provider terms say.

## 7. Response contract (`lib/schema.js`)

Keep it small. Sources come from the app, not the model, so URLs can never be fabricated.

```js
import { z } from "zod";

const list = (s) => z.array(s).max(8);

export const AnalysisSchema = z.object({
  imageQuality: z.object({
    status: z.enum(["good", "limited", "poor"]),
    retakeTips: list(z.string()),
  }),
  summary: z.string().max(600),
  observations: list(z.object({
    feature: z.string(), location: z.string(), caveat: z.string(),
  })),
  possibleExplanations: list(z.object({
    label: z.string(), rationale: z.string(), alternatives: list(z.string()),
  })),
  urgency: z.enum(["self_care", "routine", "prompt", "urgent", "emergency"]),
  urgencyReasons: list(z.string()),
  careSteps: list(z.object({
    step: z.string(), why: z.string(), avoidIf: list(z.string()),
  })),
  otcInfo: list(z.object({
    ingredientOrCategory: z.string(), purpose: z.string(), cautions: list(z.string()),
  })),
  limitations: list(z.string()),
});
```

Rules: empty arrays are valid (never force the model to invent a condition or product). No numeric confidence scores, because self-reported LLM confidence is not a calibrated medical probability. Treat model output as untrusted text.

## 8. Safety rules (enforce in prompt, server code and UI copy)

**Allowed:** describe only what is visible, with uncertainty; offer a short list of possibilities ("could be consistent with…") plus alternatives; give gentle cleansing, moisturizer and sun-protection education; explain non-prescription ingredient categories generally with label-use and "ask a pharmacist" notes; recommend a professional when warranted; ask for missing context instead of inventing it.

**Prohibited:**
- Definitive diagnoses, or calling an area "infected", "cancerous", "fungal" or "eczema" as fact.
- Prescription-only treatments or dosing (oral retinoids, antibiotics, antifungals, immunosuppressants, prescription steroids); starting potent steroids, retinoids, hydroquinone or bleaching products without clinician review.
- Mercury lighteners, bleach, lemon juice, toothpaste, baking soda, harsh scrubs or DIY mixtures.
- Inferring race, ethnicity, hygiene or baseline skin color; treating lighter skin as healthier; claiming a photo can tell a tan from other pigmentation, or promising "whitening".
- Advising anyone to delay urgent care for home remedies.

Be brief on ethics in the UI: one clear limits statement, not repeated lectures.

### Deterministic triage (`lib/triage.js`)
Compute urgency from user-reported symptoms **before and independent of** the model, then take the **higher** of the two. The model can raise urgency but never lower it.

- **Emergency**: trouble breathing or swelling of lips/tongue/throat → "Seek local emergency help now."
- **Urgent (same day)**: fever with a rash, extensive blistering/peeling, rapidly spreading painful redness, severe pain.
- **Prompt**: bleeding or a sore that does not heal, a new or changing spot. Mention the AAD ABCDEs of melanoma and link to it, without claiming to classify cancer.
- **Routine**: persistent, recurring, spreading or worrying concerns.
- **Self-care**: only when no red flags exist; include stop conditions and when to follow up.

## 9. Security and validation

- Accept only JPEG, PNG and WebP; verify magic bytes, not just extension or MIME. Reject SVG, HTML, empty files, corrupted images and files over 5 MB, on the server as well as the client.
- Cap text field lengths; sanitize and never echo raw input into prompts without delimiters.
- No third-party analytics, no remote image storage, no `localStorage` of photos or reports. Memory-only state.
- Light in-memory rate limiting is acceptable for a hackathon; say in the README that it is not reliable on serverless and not production-grade.
- Render only allowlisted `https` reference links from `lib/references.js`.

## 10. Sources (app-owned, summarized in your own words)

Put these in `lib/references.js` and verify each URL during the build:
- AAD — Skin care basics: https://www.aad.org/public/everyday-care/skin-care-basics
- AAD — Skin care routine guidance: https://www.aad.org/public/everyday-care/skin-care-basics/care
- AAD — Budget-friendly cleansing, moisturizer and sun protection: https://www.aad.org/public/everyday-care/skin-care-basics/care/skin-care-budget
- AAD — ABCDEs of melanoma: https://www.aad.org/public/diseases/skin-cancer/abcdes-melanoma
- Google AI for Developers — Gemma on the Gemini API: https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api

Never scrape and republish page text. Study (don't copy) `NiharSudani/dermaai-open-skin-analysis` for structure only, and avoid its heuristic confidence numbers.

## 11. Tests (keep lean, mock the model)

Use Vitest with a mocked Gemma client; no paid API calls.
- **schema**: valid, incomplete, malformed and out-of-enum responses.
- **imageCheck**: wrong MIME, fake extension, empty, oversized, bad magic bytes.
- **triage**: each red flag escalates, and a model answer of `self_care` cannot downgrade it; `poor` image quality shows no condition claims.
- **errors**: missing key, timeout, 429, malformed model output each show a friendly message.
- **manual**: keyboard-only pass through dialog → upload → report; mobile layout at 360px; client bundle search shows no key.

## 12. Definition of done

- [ ] `npm install`, `npm run dev`, `npm run build` all succeed from a clean checkout.
- [ ] Guide dialog opens on first visit, closes with button and `Esc`, reopens from the navbar.
- [ ] Hero, minimal navbar and single-column layout match section 5; usable on mobile.
- [ ] User can select, preview, replace and remove an image; consent gates the Analyze button.
- [ ] A real Gemma 4 call produces the rendered report; no hard-coded success path.
- [ ] Poor image, red flags, unsupported file, missing key and provider errors each behave intentionally.
- [ ] Output is non-diagnostic, source-linked, and contains no prescription instructions.
- [ ] Tests and lint pass; no secrets in the client bundle or responses.
- [ ] `.env.example`, `.gitignore` (ignoring `.env*` except the example), MIT license and README exist.
- [ ] README covers architecture, model and license, data flow (image sent to Google), limitations, testing, and Vercel and Netlify steps with server-side env vars.
- [ ] Live URL works and the 90-second demo has been rehearsed.

## 13. Build order

1. Scaffold Next.js (JS), add CSS, Navbar, Hero, Footer.
2. Build `GuideDialog` and wire the navbar button.
3. Build the `Analyzer` upload, preview, form, consent and states.
4. Write `schema.js`, `triage.js`, `imageCheck.js` before the prompt.
5. Implement `api/analyze/route.js` and `gemma.js`; connect to the UI.
6. Build `Report` and `UrgencyBanner`; add sources and Basics section.
7. Write tests; run lint and build; fix failures.
8. Deploy, set env vars on the host, test the live URL, write the README, rehearse the demo.
