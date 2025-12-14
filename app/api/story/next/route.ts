import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { StoryRequest, StoryResponse } from "@/types/story";

// FREE TIER PROTECTION: Rate limiting to stay within free tier limits
// Gemini 1.5 Flash free tier: 15 requests per minute (RPM), 1M tokens per minute (TPM)
// We'll be conservative: max 10 requests per minute to stay well under the limit
const FREE_TIER_RPM_LIMIT = 10; // Conservative limit (free tier allows 15)
const FREE_TIER_DAILY_LIMIT = 200; // Conservative daily limit to avoid any charges

// Simple in-memory rate limiter (for single instance)
// In production with multiple instances, use Redis or similar
const requestTimestamps: number[] = [];
const dailyRequestCount: { [date: string]: number } = {};

function checkRateLimit(): { allowed: boolean; message?: string } {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  
  // Clean old timestamps
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
    requestTimestamps.shift();
  }
  
  // Check per-minute limit
  if (requestTimestamps.length >= FREE_TIER_RPM_LIMIT) {
    return {
      allowed: false,
      message: `Rate limit exceeded. Free tier allows ${FREE_TIER_RPM_LIMIT} requests per minute. Please wait a moment.`
    };
  }
  
  // Check daily limit
  const today = new Date().toISOString().split('T')[0];
  const todayCount = dailyRequestCount[today] || 0;
  
  if (todayCount >= FREE_TIER_DAILY_LIMIT) {
    return {
      allowed: false,
      message: `Daily limit reached. Free tier allows ${FREE_TIER_DAILY_LIMIT} requests per day. Please try again tomorrow.`
    };
  }
  
  // Record this request
  requestTimestamps.push(now);
  dailyRequestCount[today] = todayCount + 1;
  
  return { allowed: true };
}

const StoryResponseSchema = z.object({
  beat: z.object({
    title: z.string(),
    text: z.string(),
    mood: z.string(),
    location: z.string(),
    hook: z.string(),
    turn: z.string(),
    cliffhanger: z.string(),
    choices: z.array(
      z.object({
        id: z.enum(["A", "B", "C"]),
        text: z.string(),
        tone: z.string(),
      })
    ).length(3),
  }),
  storyPanel: z.object({
    keyItems: z.array(
      z.object({
        name: z.string(),
        note: z.string(),
      })
    ),
    currentThread: z.object({
      focus: z.string(),
      leads: z.array(z.string()),
    }),
    people: z.array(
      z.object({
        name: z.string(),
        status: z.string(),
        note: z.string(),
      })
    ),
    abilities: z.array(
      z.object({
        name: z.string(),
        cost: z.string(),
        drawback: z.string(),
      })
    ),
    continuityFlags: z.array(z.string()),
  }),
  imagePrompt: z.string(),
  recapLine: z.string(),
  nextSignal: z.string(),
});

const SYSTEM_PROMPT = `You are a masterful shōnen anime storyteller creating an original, branching narrative. This is NOT a game—it's an interactive story with continuity.

CRITICAL RULES:
1. Original universe only—NO copying existing anime IP (no One Piece, Dragon Ball, Naruto, etc. names, attacks, factions, or iconic lines).
2. Teen-level shōnen tone: danger, rivalry, sacrifice, humor—NO explicit gore.
3. Anime pacing: Hook → Choice → Turn (change caused by choice) → Cliffhanger every beat.
4. Formatting:
   - Inner thoughts in *italics*
   - Technique names in ALL CAPS (e.g., "SHADOW STEP", "FLAME BREATH")
5. Choices must cause REAL divergence—not cosmetic changes.
6. Maintain continuity across beats using the storyPanel data.

OUTPUT FORMAT:
You MUST output STRICT JSON ONLY matching this exact schema:
{
  "beat": {
    "title": "string (brief, dramatic)",
    "text": "string (cinematic anime prose with inner thoughts in *italics* and techniques in ALL CAPS)",
    "mood": "string (e.g., 'tense', 'hopeful', 'mysterious')",
    "location": "string (where this beat takes place)",
    "hook": "string (what draws the reader in)",
    "turn": "string (how the choice changed things)",
    "cliffhanger": "string (what makes them want to continue)",
    "choices": [
      { "id": "A", "text": "string", "tone": "string" },
      { "id": "B", "text": "string", "tone": "string" },
      { "id": "C", "text": "string", "tone": "string" }
    ]
  },
  "storyPanel": {
    "keyItems": [{ "name": "string", "note": "string" }],
    "currentThread": { "focus": "string", "leads": ["string"] },
    "people": [{ "name": "string", "status": "string", "note": "string" }],
    "abilities": [{ "name": "string", "cost": "string", "drawback": "string" }],
    "continuityFlags": ["string"]
  },
  "imagePrompt": "string (detailed visual description for anime image generation, no style tags)",
  "recapLine": "string (one-line summary of this beat)",
  "nextSignal": "string (hint about what's coming)"
}

Respond with ONLY the JSON object, no markdown, no code blocks, no explanation.`;

async function generateStory(request: StoryRequest, retryCount = 0, fixInstruction = ""): Promise<StoryResponse> {
  try {
    console.log("[generateStory] Starting, retryCount:", retryCount);
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    console.log("[generateStory] API key found");

    let genAI: any;
    try {
      genAI = new GoogleGenerativeAI(apiKey);
      console.log("[generateStory] GoogleGenerativeAI client created");
    } catch (initError: any) {
      console.error("[generateStory] Failed to create client:", initError);
      throw new Error(`Failed to initialize Gemini client: ${initError.message}`);
    }
  
  // FREE TIER ONLY - Using models with best free tier limits
  // IMPORTANT: Only using free tier models to avoid any charges
  // Gemini 1.5 Flash has: 15 RPM, 1M TPM in free tier
  // Gemini 2.5 models have very limited free tier (removed from many accounts)
  const modelNames = [
    "gemini-1.5-flash",      // Best free tier: 15 RPM, 1M TPM
    "gemini-1.5-flash-002",  // Alternative version
    "gemini-1.5-pro"         // Fallback (if available in free tier)
  ];

  const historyText = request.history
    .slice(-12)
    .map((h, i) => {
      const choiceText = h.choiceId ? `\n[Chose ${h.choiceId}: ${h.beat.choices.find(c => c.id === h.choiceId)?.text || ""}]` : "";
      return `Beat ${i + 1}: ${h.beat.title}\n${h.beat.text}${choiceText}`;
    })
    .join("\n\n---\n\n");

  const userPrompt = `Dream: "${request.dream}"

${request.history.length > 0 ? `Story so far:\n${historyText}\n\n` : ""}Current Story Panel:
- Key Items: ${request.storyPanel.keyItems.map(i => `${i.name} (${i.note})`).join(", ") || "None"}
- Current Thread: ${request.storyPanel.currentThread.focus} (Leads: ${request.storyPanel.currentThread.leads.join(", ") || "None"})
- People: ${request.storyPanel.people.map(p => `${p.name} (${p.status}: ${p.note})`).join(", ") || "None"}
- Abilities: ${request.storyPanel.abilities.map(a => `${a.name} [Cost: ${a.cost}, Drawback: ${a.drawback}]`).join(", ") || "None"}
- Continuity Flags: ${request.storyPanel.continuityFlags.join(", ") || "None"}

${request.choiceId ? `The user chose: ${request.choiceId}` : "This is the opening beat. Create an exciting hook that introduces the world and the dream."}

${fixInstruction}

Generate the next story beat following all rules. Output STRICT JSON ONLY.`;

  const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;

  // Try each model until one works
  let lastError: Error | null = null;
  let lastErrorDetails: any = null;
  
  for (const modelName of modelNames) {
    try {
      console.log(`[INFO] Attempting to use model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      console.log(`[INFO] Model initialized, generating content...`);
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      console.log(`[INFO] Received response from ${modelName}, length: ${text?.length || 0}`);

      if (!text) {
        throw new Error("No content in Gemini response");
      }

      let parsed: unknown;
      try {
        // Try to extract JSON if wrapped in markdown code blocks
        let cleanedText = text.trim();
        // Remove markdown code blocks if present
        if (cleanedText.startsWith("```")) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
        }
        // Extract JSON object
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(cleanedText);
      } catch (error) {
        if (retryCount < 1) {
          // Retry with fix instruction
          return generateStory(request, retryCount + 1, "\n\nIMPORTANT: The previous response was invalid JSON. Fix it and output ONLY valid JSON matching the schema, no markdown, no code blocks, no explanation.");
        }
        throw new Error(`Failed to parse JSON response: ${error}`);
      }

      const validated = StoryResponseSchema.parse(parsed);
      console.log(`Successfully generated story using model: ${modelName}`);
      return validated;
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error));
      const errorName = error instanceof Error ? error.name : "";
      const errorStatus = error?.status || error?.statusCode || error?.response?.status || "";
      
      lastError = error instanceof Error ? error : new Error(String(error));
      lastErrorDetails = {
        message: errorMessage,
        name: errorName,
        status: errorStatus,
        model: modelName,
        fullError: errorString
      };
      
      console.error(`[ERROR] Model ${modelName} failed:`, {
        message: errorMessage,
        status: errorStatus,
        name: errorName
      });
      
      // Check for model not found errors (404, not found, not supported)
      // GoogleGenerativeAI errors can have different formats
      const isModelNotFoundError = 
        errorStatus === 404 ||
        String(errorStatus).includes("404") ||
        errorMessage.includes("404") || 
        errorMessage.includes("not found") ||
        errorMessage.includes("Not Found") ||
        errorMessage.includes("not supported") ||
        errorMessage.includes("is not found for API version") ||
        errorMessage.includes("is not found for API") ||
        errorString.includes("404") ||
        errorString.includes("not found") ||
        errorName === "GoogleGenerativeAI Error";
      
      if (isModelNotFoundError) {
        console.log(`[FALLBACK] ${modelName} not available (404/not found). Trying next model...`);
        const nextIndex = modelNames.indexOf(modelName);
        if (nextIndex < modelNames.length - 1) {
          continue; // Try next model
        } else {
          console.error(`[FATAL] All models exhausted. Last error:`, lastErrorDetails);
          throw new Error(`No available Gemini models. Tried: ${modelNames.join(", ")}. Last error: ${errorMessage.substring(0, 200)}`);
        }
      }
      
      // For other errors (API key, quota, etc.), throw immediately
      if (error instanceof Error) {
        if (error.message.includes("API key") || error.message.includes("API_KEY_NOT_FOUND") || error.message.includes("PERMISSION_DENIED")) {
          throw new Error("GEMINI_API_KEY is invalid or unauthorized. Check your API key in .env.local and Vercel environment variables.");
        }
        // FREE TIER PROTECTION: Handle quota/rate limit errors
        if (error.message.includes("quota") || error.message.includes("rate limit") || error.message.includes("RESOURCE_EXHAUSTED")) {
          throw new Error("FREE TIER LIMIT REACHED: You've reached the free tier quota. The app will stop working to prevent any charges. Please wait until the quota resets (usually daily).");
        }
        // FREE TIER PROTECTION: Handle billing errors
        if (error.message.includes("billing") || error.message.includes("payment") || error.message.includes("BILLING_NOT_ENABLED")) {
          throw new Error("FREE TIER ONLY: Billing is not enabled (as requested). The app uses only free tier models. If you see this error, the free quota may be exhausted.");
        }
      }
      
      // If it's a JSON parsing error and we haven't retried, retry with fix instruction
      if (retryCount < 1 && error instanceof Error && error.message.includes("parse")) {
        return generateStory(request, retryCount + 1, "\n\nIMPORTANT: The previous response was invalid JSON. Fix it and output ONLY valid JSON matching the schema, no markdown, no code blocks, no explanation.");
      }
      
      // Otherwise, throw the error
      throw error;
    }
  }
  
    // If all models failed, throw the last error
    throw lastError || new Error("All Gemini models failed. Please check your API key and model availability.");
  } catch (error: any) {
    console.error("[generateStory] Fatal error:", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    // FREE TIER PROTECTION: Check rate limits first
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      console.warn("[POST] Rate limit exceeded:", rateLimitCheck.message);
      return NextResponse.json(
        { 
          error: "Rate limit exceeded",
          message: rateLimitCheck.message,
          freeTierLimit: true
        },
        { status: 429 } // 429 Too Many Requests
      );
    }

    let body: StoryRequest;
    try {
      body = await req.json();
    } catch (parseError: any) {
      console.error("[POST] Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body", details: parseError.message },
        { status: 400 }
      );
    }

    // Validate input
    if (!body.dream || typeof body.dream !== "string") {
      return NextResponse.json(
        { error: "Invalid request: dream is required" },
        { status: 400 }
      );
    }

    console.log("[POST] Starting story generation for dream:", body.dream?.substring(0, 50));
    const storyResponse = await generateStory(body);
    console.log("[POST] Story generation successful");
    return NextResponse.json(storyResponse);
  } catch (error: any) {
    console.error("[POST] Story generation error:", error);
    console.error("[POST] Error type:", typeof error);
    console.error("[POST] Error name:", error?.name);
    console.error("[POST] Error message:", error?.message);
    console.error("[POST] Error stack:", error?.stack?.substring(0, 500));
    
    // Try to stringify error for more details
    try {
      console.error("[POST] Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    } catch (stringifyError) {
      console.error("[POST] Could not stringify error");
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Provide helpful error messages for common issues
    if (errorMessage.includes("GEMINI_API_KEY") || errorMessage.includes("API key")) {
      return NextResponse.json(
        { 
          error: "Missing or invalid GEMINI_API_KEY. Please check your .env.local file and Vercel environment variables.",
          details: errorMessage
        },
        { status: 500 }
      );
    }
    
    // FREE TIER PROTECTION: Handle quota/rate limit errors
    if (errorMessage.includes("quota") || errorMessage.includes("rate limit") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      return NextResponse.json(
        { 
          error: "FREE TIER LIMIT REACHED",
          message: "You've reached the free tier quota. The app will stop working to prevent any charges. Please wait until the quota resets (usually daily).",
          freeTierLimit: true,
          details: errorMessage
        },
        { status: 429 }
      );
    }
    
    // FREE TIER PROTECTION: Handle billing errors
    if (errorMessage.includes("billing") || errorMessage.includes("payment") || errorMessage.includes("BILLING_NOT_ENABLED")) {
      return NextResponse.json(
        { 
          error: "FREE TIER ONLY",
          message: "Billing is not enabled (as requested). The app uses only free tier models. If you see this error, the free quota may be exhausted.",
          freeTierLimit: true,
          details: errorMessage
        },
        { status: 403 }
      );
    }
    
    if (errorMessage.includes("No available Gemini models") || errorMessage.includes("All Gemini models failed")) {
      return NextResponse.json(
        { 
          error: "No available Gemini models for your API key. Please check which models are available in your Google AI Studio account.",
          details: errorMessage
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Failed to generate story",
        details: errorMessage,
        type: error?.name || "UnknownError"
      },
      { status: 500 }
    );
  }
}
