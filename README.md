# SkinSense

SkinSense is a Next.js research and education tool that analyzes a user-provided photo of a visible skin concern. It returns cautious visual observations, possible explanations, general care information, and guidance about when professional care may be appropriate.

> **Important:** SkinSense is not a medical device and does not provide a diagnosis. A photo cannot replace an in-person clinical examination.

## Features

- Clear first-visit guide explaining the workflow and privacy boundary
- JPEG, PNG, and WebP upload support
- 5 MB server-side image limit with MIME and file-signature validation
- Body-area context selection
- Server-only Google AI model integration
- Structured report validation with Zod
- Research-oriented observations with uncertainty and limitations
- Friendly loading, success, error, and retry states
- Toast notifications powered by `sonner`
- Responsive layout with print/save as PDF support
- No accounts, analytics, image history, or persistent image storage

## Tech stack

- Next.js App Router
- React
- Plain JavaScript and JSX
- Plain CSS
- `@google/genai`
- `zod`
- `sonner`

## Run locally

Install dependencies:

```bash
npm install
```

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_server_side_google_ai_key
GEMMA_MODEL=gemma-26b
```

### Configured model

The current model is:

```text
gemma-26b
Model ID: gemma-26b

```

It is configured through `GEMMA_MODEL` so the model can be changed without editing application code. The selected model must support `generateContent` and image input through the Google AI API.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Restart the development server after changing `.env.local`; Next.js loads environment variables when the server starts.

## How it works

1. The user selects a clear image and chooses the body area.
2. The browser validates the file type and size before submission.
3. `Analyzer.js` sends the image as multipart form data to `/api/analyze`.
4. The server validates the image again, including its file signature.
5. The server sends the image inline to the configured Gemini model.
6. The model response is parsed and validated with Zod.
7. The validated report is rendered as plain React text.

The API key is only read on the server. Images are processed in memory for the request and are not saved by SkinSense.

## Project structure

```text
src/
  app/
    api/analyze/route.js  # Server-side upload validation and model request
    globals.css           # Global responsive styles
    layout.js             # Metadata and toast provider
    page.js               # Main page, guide, report, and footer
  components/
    Analyzer.js           # Upload state, request lifecycle, loading, and errors
public/
  loading.svg
orchestrator.md
```

## Troubleshooting

### “The analysis service is not configured”

Make sure `.env.local` contains a valid `GEMINI_API_KEY`, then restart `npm run dev`.

### “The configured model was not found”

Check that `GEMMA_MODEL` is a valid model available to your Google AI key. The current project value is:

```env
GEMMA_MODEL=gemma-26b
```

### Timeout or temporary Google AI error

Try a smaller, clearer image and retry. Google AI availability and response time can vary. The interface shows the backend error and provides a retry action rather than displaying a fabricated report.

### Exposed or rejected API key

Revoke the exposed key in Google AI Studio, create a new server-side key, place it in `.env.local`, and restart the development server. Never use `NEXT_PUBLIC_GEMINI_API_KEY` and never commit environment files.

## Validation

```bash
npm run lint
npm run build
```

The API also handles invalid file types, oversized files, bad image signatures, malformed model JSON, timeouts, rate limits, and upstream errors.

## Safety and privacy

SkinSense describes visible image features cautiously and does not claim a confirmed condition. It does not infer identity, ethnicity, hygiene, or baseline skin tone. It does not provide prescription treatment or medical dosing.

The image is transmitted to Google’s AI service for analysis. SkinSense does not save the image or maintain user history. Do not upload identifying information or photos containing unnecessary personal details.

## Sources

- [American Academy of Dermatology — Skin care basics](https://www.aad.org/public/everyday-care/skin-care-basics)
- [Google AI for Developers — Gemma on the Gemini API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api)
