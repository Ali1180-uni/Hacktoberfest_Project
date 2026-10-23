# SkinSense

SkinSense is a small Next.js research-oriented educational tool for looking at a visible skin concern. It combines a user-provided image and body-area context into a cautious visual analysis. It does not diagnose medical conditions.

## Run locally

```bash
npm install
npm run dev
```

To enable real reports, create `.env.local` with:

```env
GEMINI_API_KEY=your_server_side_key
GEMMA_MODEL=gemini-3.6-flash
```

The key is read only by `src/app/api/analyze/route.js`; it is never included in the client bundle. The app sends the image to Google’s API for analysis and does not save it. This is for research and education, not a medical device or diagnosis.

If the API responds with a rejected-key message, revoke any previously exposed key and create a fresh Google AI Studio key. Put the new value in `.env.local`; never commit it to Git.

## Checks

```bash
npm run lint
npm run build
```

## Safety boundaries

The server validates image type, magic bytes, and the 5 MB size limit before calling the model. The report uses allowlisted source links and does not show confidence scores.
