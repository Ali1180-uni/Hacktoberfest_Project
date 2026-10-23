import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const runtime = "nodejs";

const ReportSchema = z.object({
  imageQuality: z.object({ status: z.enum(["good", "limited", "poor"]), retakeTips: z.array(z.string()).max(8) }),
  summary: z.string().max(600),
  observations: z.array(z.object({ feature: z.string(), location: z.string(), caveat: z.string() })).max(8),
  possibleExplanations: z.array(z.object({ label: z.string(), rationale: z.string(), alternatives: z.array(z.string()).max(8) })).max(8),
  urgency: z.enum(["self_care", "routine", "prompt", "urgent", "emergency"]),
  urgencyReasons: z.array(z.string()).max(8),
  careSteps: z.array(z.object({ step: z.string(), why: z.string(), avoidIf: z.array(z.string()).max(8) })).max(8),
  otcInfo: z.array(z.object({ ingredientOrCategory: z.string(), purpose: z.string(), cautions: z.array(z.string()).max(8) })).max(8),
  limitations: z.array(z.string()).max(8),
});

const MODEL_TIMEOUT_MS = 120000;

function validImage(bytes, mime) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (mime === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (mime === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

function parseReport(text) {
  const cleaned = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return ReportSchema.parse(JSON.parse(cleaned));
}

function modelError(error) {
  let status = Number(error?.status || error?.statusCode);
  if (!status && typeof error?.message === "string") {
    try {
      status = Number(JSON.parse(error.message)?.error?.code);
    } catch {
      status = 0;
    }
  }
  if (status === 401 || status === 403) return { status: 502, message: "The Google AI key was rejected. Check GEMINI_API_KEY." };
  if (status === 404) return { status: 502, message: "The configured model was not found. Check GEMMA_MODEL in .env and restart the dev server." };
  if (status === 400) return { status: 502, message: "Google rejected the analysis request. Check the image format and model configuration, then try again." };
  if (status === 429) return { status: 429, message: "Google AI is temporarily rate-limiting requests. Please wait." };
  if (error?.name === "AbortError") return { status: 504, message: "The image analysis took too long. Please try a smaller image." };
  return { status: 502, message: "Google AI returned an error. Please try again." };
}

export async function POST(request) {
  if (!process.env.GEMINI_API_KEY) return Response.json({ message: "The analysis service is not configured yet." }, { status: 503 });

  try {
    const form = await request.formData();
    const image = form.get("image");
    
    if (!image || typeof image.arrayBuffer !== "function" || image.size === 0 || image.size > 5 * 1024 * 1024) {
      return Response.json({ message: "Please provide an image under 5 MB." }, { status: 400 });
    }
    
    const bytes = new Uint8Array(await image.arrayBuffer());
    if (!validImage(bytes, image.type)) {
      return Response.json({ message: "That file type is not supported. Please use a JPEG, PNG or WebP image." }, { status: 400 });
    }

    const area = String(form.get("area") || "not provided").slice(0, 40);
    const prompt = `You are a visual skin-observation assistant. Analyze the image. Return a JSON object matching this schema: {"imageQuality":{"status":"good|limited|poor","retakeTips":[]},"summary":"","observations":[{"feature":"","location":"","caveat":""}],"possibleExplanations":[{"label":"","rationale":"","alternatives":[]}],"urgency":"self_care|routine|prompt|urgent|emergency","urgencyReasons":[],"careSteps":[{"step":"","why":"","avoidIf":[]}],"otcInfo":[{"ingredientOrCategory":"","purpose":"","cautions":[]}],"limitations":[]}. Describe only visible features with uncertainty. User-selected area: ${area}.`;
    
    const imagePart = { inlineData: { mimeType: image.type, data: Buffer.from(bytes).toString("base64") } };
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const model = process.env.GEMMA_MODEL || "gemini-3.8-flash";
    
    const apiRequest = ai.models.generateContent({
      model: model,
      contents: [{ role: "user", parts: [{ text: prompt }, imagePart] }],
      config: { 
        responseMimeType: "application/json", // Flash natively guarantees JSON output!
        temperature: 0.1 
      }
    });

    const result = await Promise.race([
      apiRequest,
      new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error("Timed out"), { name: "AbortError" })), MODEL_TIMEOUT_MS))
    ]);

    let parsed;
    try {
      parsed = parseReport(result.text);
    } catch {
      const repair = `${prompt} Return the complete valid JSON object again. Do not use markdown or code fences. Include every required key, using empty arrays where needed.`;
      const repairedRequest = ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: repair }, imagePart] }],
        config: { responseMimeType: "application/json", temperature: 0.1 },
      });
      const repairedResult = await Promise.race([
        repairedRequest,
        new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error("Timed out"), { name: "AbortError" })), MODEL_TIMEOUT_MS)),
      ]);
      parsed = parseReport(repairedResult.text);
    }
    return Response.json(parsed);

  } catch (error) {
    const mapped = modelError(error);
    return Response.json({ message: mapped.message }, { status: mapped.status });
  }
}