---
name: skinsense-ai
description: Maintain SkinSense, a plain-JavaScript Next.js App Router app that accepts a skin image and returns a cautious, research-oriented visual report. Use for UI, upload flow, API, model integration, validation, safety, testing, and deployment work.
license: MIT
metadata:
  version: "3.0.0"
  category: healthcare-adjacent-ai
  language: javascript
---

# SkinSense project guide

SkinSense is an educational and research-oriented image analysis tool. It is **not a diagnostic device** and must never present a confirmed medical diagnosis.

## Product flow

1. Show the first-visit guide once per browser session.
2. Let the user choose a JPEG, PNG, or WebP image up to 5 MB.
3. Collect the body area and required privacy consent.
4. Upload the image to `POST /api/analyze`.
5. Show a loading state, a clear error with retry, or a validated report.
6. Explain that the image is sent to Google AI and is not stored by SkinSense.

Do not add accounts, history, analytics, chat, confidence scores, diagnosis claims, or fake fallback reports.

## Project structure

```text
src/
  app/
    api/analyze/route.js   # Server-only upload validation and Google AI call
    globals.css            # Plain responsive CSS
    layout.js              # Metadata and global Toaster
    page.js                # Shell, guide, report, basics, footer
  components/
    Analyzer.js            # Upload state machine and request lifecycle
public/
  loading.svg
.env                      # Local environment values; never commit secrets
orchestrator.md           # Short application flow overview
```

Use plain JavaScript and JSX. Do not introduce TypeScript or a UI framework.

## Environment

```env
GEMINI_API_KEY=server_side_key
GEMMA_MODEL=gemini-3.6-flash
```

The API key must only be read in `src/app/api/analyze/route.js`. Never use a `NEXT_PUBLIC_` key, expose it in client code, log it, or commit it. Restart Next.js after changing environment variables.

The configured model must support `generateContent` and image input. If Google retires or restricts the model, verify available models with the provider before changing the app.

## Analyzer requirements

`Analyzer.js` uses this state machine:

```text
idle → ready → analyzing → result | error
```

It must:

- Validate MIME type and file size before upload.
- Use `FormData` and send the image to `/api/analyze`.
- Catch network errors, non-2xx responses, malformed JSON, and empty reports.
- Display the backend message in the error UI and provide a retry button.
- Log only safe client telemetry: payload size, timestamps, latency, HTTP status, and parsed response. Never log image bytes, API keys, prompts, or personal health details.
- Show a lightweight loading state and respect `prefers-reduced-motion`.

## API requirements

`route.js` must use:

```js
export const runtime = "nodejs";
```

Before calling Google AI, validate:

- HTTP method and multipart form data
- Image presence, MIME type, magic bytes, and 5 MB limit
- Body-area length and allowed values
- Required server-side API key

Send image data inline and keep it in memory only. Request JSON, parse it safely, validate it with Zod, and retry malformed model output at most once. Map provider errors to friendly messages for missing/rejected keys, unavailable models, rate limits, timeouts, invalid requests, and upstream failures. Do not expose raw provider errors.

## Report contract

The report may contain:

- Image quality and retake tips
- A short uncertain summary
- Visible observations with location and caveat
- Possible explanations and alternatives
- Urgency level and reasons
- Gentle care steps
- General OTC categories with cautions
- Limitations

Empty arrays are valid. Do not invent a condition, cause, hygiene judgment, skin tone, identity, or numerical confidence.

If image quality is poor, show retake guidance and generic safety notes only. Never turn an image into a definitive diagnosis.

## Safety language

Use phrases such as “may be consistent with,” “could reflect,” and “a photo cannot replace an examination.” Never state that a condition is confirmed or tell a user to delay urgent care.

Do not recommend prescription medicines, unsafe DIY treatments, bleaching products, or treatment dosages. Encourage professional care for urgent, worsening, persistent, bleeding, changing, or non-healing concerns.

## UI and accessibility

- Keep the layout calm, responsive, and usable at 360px width.
- Use visible focus styles and semantic labels.
- Use `aria-live` for loading, errors, and report completion.
- Render model text as React text; never use `dangerouslySetInnerHTML`.
- Keep warnings distinguishable by text, icon, and border, not color alone.
- Use the existing `sonner` Toaster for concise success and error feedback.
- Do not use yellow loading or error elements.

## Validation checklist

Run the smallest relevant checks after changes:

```bash
npm run lint
npm run build
```

For API changes, also test:

- Valid image returns a validated report.
- Empty, oversized, wrong-MIME, and bad-magic-byte files fail safely.
- Missing or rejected credentials show a useful message.
- Malformed model output is retried once and then fails clearly.
- Network failure, timeout, rate limit, and non-2xx responses reach the retry UI.

Never use a hard-coded fake report to hide a provider failure. Fix the configuration or show the honest retry state.
