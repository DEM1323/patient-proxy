import {
  GoogleGenerativeAI,
  GoogleGenerativeAIAbortError,
  type GenerationConfig,
} from "@google/generative-ai";
import { patientReplyBudgetMs } from "./model";
import type { PatientPrompt } from "./patientPrompt";

// Preferred model first. gemini-2.5-flash is closed to new API keys, and the
// free tier's gemini-3.8-flash quota is too small for practice sessions.
// gemini-3.5-flash allows only 20 requests a day on the free tier; the
// flash-lite fallbacks allow 500 but are often overloaded (503).
export const patientModels = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
];
const attemptsPerModel = 2;
const overloadBackoffMs = 1_000;
// Below this, a request cannot plausibly complete, so the budget is spent.
const minRequestMs = 2_000;

// gemini-3.5-flash replies have taken up to 15 seconds under load, so one
// request may use 25 seconds, within the reply budget.
const patientRequestTimeoutMs = 25_000;
// Feedback is longer JSON; its budget stays within the feedback deadline.
export const feedbackBudgetMs = 130_000;
const feedbackRequestTimeoutMs = 45_000;

/**
 * Calls Gemini from protected backend code only. The key lives in the Convex
 * deployment environment and never reaches the browser. Callers that make
 * several calls for one reply pass one shared deadline.
 */
export async function completePatientReply(
  prompt: PatientPrompt,
  deadline = Date.now() + patientReplyBudgetMs,
) {
  return await complete(prompt, {
    // A short in-character reply does not need thinking, which otherwise
    // spends the output budget and adds latency.
    generationConfig: { temperature: 0.6, maxOutputTokens: 300 },
    deadline,
    requestTimeoutMs: patientRequestTimeoutMs,
  });
}

// Formative Feedback as JSON; the caller validates its structure and evidence.
export async function completeFeedback(prompt: PatientPrompt) {
  return await complete(prompt, {
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2_000,
      responseMimeType: "application/json",
    },
    deadline: Date.now() + feedbackBudgetMs,
    requestTimeoutMs: feedbackRequestTimeoutMs,
  });
}

// Minimal thinking for each model. gemini-3.5-flash-lite rejects a zero
// thinking budget (400) but accepts the minimal thinking level.
export function minimalThinking(model: string) {
  return model === "gemini-3.5-flash-lite"
    ? { thinkingLevel: "minimal" }
    : { thinkingBudget: 0 };
}

async function complete(
  prompt: PatientPrompt,
  options: {
    generationConfig: GenerationConfig;
    deadline: number;
    requestTimeoutMs: number;
  },
) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
  }
  const client = new GoogleGenerativeAI(apiKey);
  return await withModelFallback(
    async (model, timeoutMs) => {
      const result = await client
        .getGenerativeModel(
          {
            model,
            systemInstruction: prompt.systemInstruction,
            generationConfig: {
              ...options.generationConfig,
              thinkingConfig: minimalThinking(model),
            } as GenerationConfig,
          },
          { timeout: timeoutMs },
        )
        .generateContent({ contents: prompt.contents });
      // Throws when the response was blocked or has no candidate.
      return result.response.text();
    },
    {
      deadline: options.deadline,
      requestTimeoutMs: options.requestTimeoutMs,
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    },
  );
}

export type FailedRequest = {
  model: string;
  attempt: number;
  // The HTTP status, "timeout", or "error" for anything else.
  outcome: number | "timeout" | "error";
  ms: number;
};

/**
 * Retries an overloaded (503) model once, then moves to the next model when a
 * model stays overloaded, is rate limited (429), is unavailable to this key
 * (404), or times out. Other errors, such as a blocked response, fail at once.
 * Every request gets at most `requestTimeoutMs`, and none starts or runs past
 * the shared deadline. Each failed request is logged without prompt or reply
 * text.
 */
export async function withModelFallback(
  call: (model: string, timeoutMs: number) => Promise<string>,
  options: {
    deadline: number;
    requestTimeoutMs: number;
    sleep: (ms: number) => Promise<void>;
    now?: () => number;
    models?: string[];
    log?: (failure: FailedRequest) => void;
  },
) {
  const {
    deadline,
    requestTimeoutMs,
    sleep,
    now = Date.now,
    models = patientModels,
    log = (failure) => console.warn("Gemini request failed", failure),
  } = options;
  let lastError: unknown = new Error("Gemini time budget exhausted");
  for (const model of models) {
    for (let attempt = 1; attempt <= attemptsPerModel; attempt++) {
      const remaining = deadline - now();
      if (remaining < minRequestMs) {
        throw lastError;
      }
      const started = now();
      try {
        return await call(model, Math.min(requestTimeoutMs, remaining));
      } catch (error) {
        lastError = error;
        const status = httpStatus(error);
        const timedOut = error instanceof GoogleGenerativeAIAbortError;
        log({
          model,
          attempt,
          outcome: timedOut ? "timeout" : (status ?? "error"),
          ms: now() - started,
        });
        if (status === 503 && attempt < attemptsPerModel) {
          await sleep(overloadBackoffMs * attempt);
          continue;
        }
        if (status === 503 || status === 429 || status === 404 || timedOut) {
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
