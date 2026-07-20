import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";
const PORT = 3000;

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please configure it in your Secrets panel in the Settings menu.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 120000, // 120 seconds of timeout for generation
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function generateWithFallbackAndRetry(ai: GoogleGenAI, params: any, retries = 2, delayMs = 1000): Promise<any> {
  const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[AI Server] Attempting generation with model "${model}" (Attempt ${attempt}/${retries})`);
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        console.log(`[AI Server] Successfully generated content using model "${model}"`);
        return response;
      } catch (error: any) {
        lastError = error;
        console.error(`[AI Server] Error with model "${model}" on attempt ${attempt}:`, error?.message || error);

        const isTemporary =
          error?.status === "UNAVAILABLE" ||
          error?.code === 503 ||
          error?.status === "RESOURCE_EXHAUSTED" ||
          error?.code === 429 ||
          (error?.message && (
            error.message.includes("experiencing high demand") ||
            error.message.includes("503") ||
            error.message.includes("temporary") ||
            error.message.includes("limit") ||
            error.message.includes("UNAVAILABLE")
          ));

        if (!isTemporary) {
          // If it's a fatal config or validation error, switch to the next model immediately instead of retrying
          console.warn(`[AI Server] Non-temporary error, skipping to next model.`);
          break;
        }

        if (attempt < retries) {
          const sleepTime = delayMs * Math.pow(2, attempt - 1);
          console.log(`[AI Server] Retrying in ${sleepTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, sleepTime));
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content with all fallback models.");
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      hasGeminiKey: !!process.env.GEMINI_API_KEY
    });
  });

  app.post("/api/generate", async (req, res) => {
    try {
      const { emailType, recipientSegment, topic, tone, includeEmojis, customTone, customEmailType, customSegment } = req.body;

      if (!topic || !emailType || !recipientSegment) {
        return res.status(400).json({ error: "Email type, recipient segment, and topic are required." });
      }

      const ai = getAiClient();

      const finalEmailType = emailType === "custom" ? customEmailType : emailType;
      const finalSegment = recipientSegment === "custom" ? customSegment : recipientSegment;
      const finalTone = tone === "custom" ? customTone : tone;

      const systemInstruction = `You are an expert email marketer specializing in high-converting B2B and B2C SaaS, eCommerce, and corporate nurturing campaigns.
Your goal is to generate 3 distinct A/B testing pairs of Email Subject Lines and Preview Texts.
Each pair should represent a different optimization strategy (e.g., Benefit-Driven, Curiosity Gap, Social Proof, Urgency/Scarcity, Personalization, Question-Based).
Ensure that the subject lines are short (ideally under 60 characters) and preview texts are punchy (ideally under 140 characters).
Make sure the tone matches "${finalTone || 'professional and engaging'}".`;

      const prompt = `Generate 3 A/B test variants of email subject lines and preview texts for:
- Email Type: ${finalEmailType}
- Recipient Segment: ${finalSegment}
- Main Topic / Offer / Core Message: ${topic}
- Target Tone: ${finalTone || 'Professional & Engaging'}
- Emojis: ${includeEmojis ? 'Allowed and encouraged where appropriate' : 'Strictly disabled (do not suggest or include emojis in the subject or preview)'}

Provide your response in JSON format matching the schema defined below.`;

      const response = await generateWithFallbackAndRetry(ai, {
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              variants: {
                type: Type.ARRAY,
                description: "Array of exactly 3 different A/B testing variants",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    strategyName: { type: Type.STRING, description: "The strategy, e.g., Curiosity Gap, Benefit-Driven, Urgency" },
                    strategyDescription: { type: Type.STRING, description: "A brief description of this email psychological trigger" },
                    subjectLine: { type: Type.STRING, description: "The subject line to test. If emojis are enabled, you may use them." },
                    previewText: { type: Type.STRING, description: "The preview text / preheader. If emojis are enabled, you may use them." },
                    charCountSubject: { type: Type.INTEGER, description: "Character length of the subject line" },
                    charCountPreview: { type: Type.INTEGER, description: "Character length of the preview text" },
                    includeEmoji: { type: Type.BOOLEAN, description: "Whether this variant includes emojis" },
                    suggestedEmojis: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of 2-3 emojis that fit this specific variant style"
                    },
                    explanation: { type: Type.STRING, description: "Brief marketing-focused justification of why this combination improves open rates for this segment" }
                  },
                  required: ["id", "strategyName", "strategyDescription", "subjectLine", "previewText", "charCountSubject", "charCountPreview", "includeEmoji", "suggestedEmojis", "explanation"]
                }
              },
              overallTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "2-3 high-level tips specifically for optimizing open rates for this segment and topic"
              }
            },
            required: ["variants", "overallTips"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response received from the AI model.");
      }

      const result = JSON.parse(responseText);
      res.json(result);
    } catch (error: any) {
      console.error("Generation error:", error);
      res.status(500).json({ error: error?.message || "An unexpected error occurred during copy generation." });
    }
  });

  // API 404 handler
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found` });
  });

  // Global error handling middleware to ensure all server errors are returned as JSON
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Express global error handler caught:", err);
    res.status(500).json({ 
      error: err?.message || "An unexpected internal server error occurred." 
    });
  });

  // Serve built static files from the dist folder
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} [${isProd ? "PROD" : "DEV"}]`);
  });
}

startServer();
