import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const runtime = "nodejs";

// Zod Schema to strictly validate the model's output
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

function validImage(bytes, mime) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (mime === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (mime === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

function parseModelJson(text) {
  const raw = String(text || "");
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in the model response.");
  return ReportSchema.parse(JSON.parse(match[0]));
}

function modelError(error) {
  const status = Number(error?.status || error?.statusCode);
  if (status === 401 || status === 403) return { status: 502, message: "The Google AI key was rejected. Check GEMINI_API_KEY." };
  if (status === 404) return { status: 502, message: "The configured Gemma model was not found." };
  if (status === 429) return { status: 429, message: "Google AI is temporarily rate-limiting requests. Please wait." };
  if (status >= 500) return { status: 502, message: "Google's AI service is temporarily down (HTTP 500). Please try a smaller image." };
  return { status: 502, message: "Google AI returned a report that could not be read." };
}

// Automatic retry mechanism (Adapted from your friend's code)
async function generateWithRetry(ai, payload, retries = 3, delay = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[SkinSense] Sending request to API (attempt ${i + 1})...`);
      return await ai.models.generateContent(payload);
    } catch (error) {
      console.log(`[SkinSense] API attempt ${i + 1} failed: ${error.message}`);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
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
    const prompt = `You are a visual skin-observation assistant. Analyze the image. Return one valid JSON object only, matching this exact shape: {"imageQuality":{"status":"good|limited|poor","retakeTips":[]},"summary":"","observations":[{"feature":"","location":"","caveat":""}],"possibleExplanations":[{"label":"","rationale":"","alternatives":[]}],"urgency":"self_care|routine|prompt|urgent|emergency","urgencyReasons":[],"careSteps":[{"step":"","why":"","avoidIf":[]}],"otcInfo":[{"ingredientOrCategory":"","purpose":"","cautions":[]}],"limitations":[]}. Describe only visible features with uncertainty. User-selected area: ${area}.`;
    
    const base64Image = Buffer.from(bytes).toString("base64");
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Constructing the exact payload structure your friend used
    const payload = {
      model: process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: image.type
              }
            },
            {
              text: prompt
            }
          ]
        }
      ]
    };
    
    let result = await generateWithRetry(ai, payload);
    console.log('[SkinSense] Received response successfully!');
    
    let parsed;
    try {
      parsed = parseModelJson(result.text);
    } catch {
      console.log('[SkinSense] JSON extraction failed, attempting one repair run...');
      // If it hallucinates non-JSON, retry one time asking it to fix the JSON
      payload.contents[0].parts[1].text = `${prompt} Your previous response was invalid JSON. Return the complete JSON object again.`;
      result = await generateWithRetry(ai, payload, 1); // Only retry once for repairs
      parsed = parseModelJson(result.text);
    }
    
    return Response.json(parsed);

  } catch (error) {
    console.error("[SkinSense Backend API Error]:", error);
    const mapped = modelError(error);
    return Response.json({ message: mapped.message }, { status: mapped.status });
  }
}