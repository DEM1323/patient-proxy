import {
  GoogleGenerativeAI,
  GoogleGenerativeAIAbortError,
  type GenerationConfig,
} from "@google/generative-ai";
import type { PatientPrompt } from "./patientPrompt";

// Preferred model first. gemini-2.5-flash is closed to new API keys, and the
// free tier's gemini-3.8-flash quota is too small for practice sessions.
export const patientModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
const attemptsPerModel = 2;
const overloadBackoffMs = 1_000;

// Worst case for feedback: two 30-second requests per model plus backoff,
// which stays within the feedback deadline.
export const feedbackRequestTimeoutMs = 30_000;

/**
 * Calls Gemini from protected backend code only. The key lives in the Convex
 * deployment environment and never reaches the browser.
 */
export async function completePatientReply(prompt: PatientPrompt) {
  return await complete(prompt, {
    // A short in-character reply does not need thinking, which otherwise
    // spends the output budget and adds latency.
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 300,
      thinkingConfig: { thinkingBudget: 0 },
    } as GenerationConfig,
    timeoutMs: 12_000,
  });
}

// Formative Feedback as JSON; the caller validates its structure and evidence.
export async function completeFeedback(prompt: PatientPrompt) {
  return await complete(prompt, {
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2_000,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    } as GenerationConfig,
    timeoutMs: feedbackRequestTimeoutMs,
  });
}

async function complete(
  prompt: PatientPrompt,
  options: { generationConfig: GenerationConfig; timeoutMs: number },
) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
  }
  const client = new GoogleGenerativeAI(apiKey);
  return await withModelFallback(
    async (model) => {
      const result = await client
        .getGenerativeModel(
          {
            model,
            systemInstruction: prompt.systemInstruction,
            generationConfig: options.generationConfig,
          },
          { timeout: options.timeoutMs },
        )
        .generateContent({ contents: prompt.contents });
      // Throws when the response was blocked or has no candidate.
      return result.response.text();
    },
    (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  );
}

/**
 * Retries an overloaded (503) model once, then moves to the next model when a
 * model stays overloaded, is rate limited (429), is unavailable to this key
 * (404), or times out. Other errors, such as a blocked response, fail at once.
 * Worst case stays within the exchange deadline.
 */
export async function withModelFallback(
  call: (model: string) => Promise<string>,
  sleep: (ms: number) => Promise<void>,
  models = patientModels,
) {
  let lastError: unknown;
  for (const model of models) {
    for (let attempt = 1; attempt <= attemptsPerModel; attempt++) {
      try {
        return await call(model);
      } catch (error) {
        lastError = error;
        const status = httpStatus(error);
        if (status === 503 && attempt < attemptsPerModel) {
          await sleep(overloadBackoffMs * attempt);
          continue;
        }
        if (
          status === 503 ||
          status === 429 ||
          status === 404 ||
          error instanceof GoogleGenerativeAIAbortError
        ) {
          break;
        }
        throw error;
      }
    }
  }
  throw lastError;
}

function httpStatus(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : undefined;
}
