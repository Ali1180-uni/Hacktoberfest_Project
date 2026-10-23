# SkinSense Orchestrator

SkinSense coordinates a simple image-analysis flow:

1. The user selects a JPEG, PNG, or WebP image.
2. The `Analyzer` component validates the file and collects the selected body area.
3. The client sends the image to `/api/analyze`.
4. The API validates the upload and forwards it to the configured Google AI model.
5. The response is validated before being rendered as the research-oriented report.
6. Loading, success, error, and retry states are shown in the UI.

The API key stays server-side in the environment configuration. Images are held in memory for the request and are not stored by SkinSense.
