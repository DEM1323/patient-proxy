import {
  GoogleGenerativeAIAbortError,
  GoogleGenerativeAIFetchError,
} from "@google/generative-ai";
import { describe, expect, it, vi } from "vitest";
import {
  type FailedRequest,
  minimalThinking,
  patientModels,
  withModelFallback,
} from "./gemini";

const failure = (status: number) =>
  new GoogleGenerativeAIFetchError(`HTTP ${status}`, status);
const timeout = () => new GoogleGenerativeAIAbortError("Request aborted");

// Each outcome takes `ms` of simulated time; a timeout uses the full limit.
type Outcome = { result: Error | string; ms?: number };

function run(
  outcomes: Record<string, Outcome[]>,
  { budgetMs = 50_000, requestTimeoutMs = 25_000 } = {},
) {
  let clock = 0;
  const calls: { model: string; timeoutMs: number }[] = [];
  const failures: FailedRequest[] = [];
  const sleep = vi.fn(async (ms: number) => {
    clock += ms;
  });
  const call = async (model: string, timeoutMs: number) => {
    calls.push({ model, timeoutMs });
    const outcome = outcomes[model]?.shift() ?? { result: failure(500) };
    const isTimeout = outcome.result instanceof GoogleGenerativeAIAbortError;
    clock += isTimeout ? timeoutMs : (outcome.ms ?? 100);
    if (outcome.result instanceof Error) {
      throw outcome.result;
    }
    return outcome.result;
  };
  const result = withModelFallback(call, {
    deadline: budgetMs,
    requestTimeoutMs,
    sleep,
    now: () => clock,
    log: (failed) => failures.push(failed),
  });
  return {
    models: () => calls.map(({ model }) => model),
    calls,
    failures,
    sleep,
    result,
  };
}

const [primary, fallback, lastResort] = patientModels;

describe("Gemini model fallback", () => {
  it("prefers gemini-3.5-flash, then the two flash-lite models", () => {
    expect(patientModels).toEqual([
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash-lite",
    ]);
  });

  it("asks each model for minimal thinking in the form it accepts", () => {
    expect(minimalThinking("gemini-3.5-flash")).toEqual({ thinkingBudget: 0 });
    expect(minimalThinking("gemini-3.1-flash-lite")).toEqual({ thinkingBudget: 0 });
    expect(minimalThinking("gemini-3.5-flash-lite")).toEqual({
      thinkingLevel: "minimal",
    });
  });

  it("waits up to the request timeout for a slow reply", async () => {
    // A 15-second reply, as measured on 2026-10-08, used to be abandoned at 12.
    const slow = run({ [primary]: [{ result: "Mm... hi.", ms: 15_000 }] });
    await expect(slow.result).resolves.toBe("Mm... hi.");
    expect(slow.calls).toEqual([{ model: primary, timeoutMs: 25_000 }]);
    expect(slow.failures).toEqual([]);
  });

  it("retries an overloaded model once before succeeding", async () => {
    const { models, sleep, failures, result } = run({
      [primary]: [{ result: failure(503) }, { result: "Mm... hi." }],
    });
    await expect(result).resolves.toBe("Mm... hi.");
    expect(models()).toEqual([primary, primary]);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(failures).toEqual([
      { model: primary, attempt: 1, outcome: 503, ms: 100 },
    ]);
  });

  it("falls back when a model stays overloaded, is rate limited, is unknown, or times out", async () => {
    for (const primaryFailures of [
      [{ result: failure(503) }, { result: failure(503) }],
      [{ result: failure(429) }],
      [{ result: failure(404) }],
      [{ result: timeout() }],
    ]) {
      const { models, result } = run({
        [primary]: [...primaryFailures],
        [fallback]: [{ result: "I'm not sure." }],
      });
      await expect(result).resolves.toBe("I'm not sure.");
      expect(models()).toEqual([...primaryFailures.map(() => primary), fallback]);
    }
  });

  it("reaches the last-resort model and logs every failed request", async () => {
    const { models, failures, result } = run({
      [primary]: [{ result: timeout() }],
      [fallback]: [
        { result: failure(503), ms: 8_000 },
        { result: failure(503), ms: 1_000 },
      ],
      [lastResort]: [{ result: "Where am I?", ms: 2_000 }],
    });
    await expect(result).resolves.toBe("Where am I?");
    expect(models()).toEqual([primary, fallback, fallback, lastResort]);
    expect(failures).toEqual([
      { model: primary, attempt: 1, outcome: "timeout", ms: 25_000 },
      { model: fallback, attempt: 1, outcome: 503, ms: 8_000 },
      { model: fallback, attempt: 2, outcome: 503, ms: 1_000 },
    ]);
  });

  it("never runs a request past the shared deadline", async () => {
    const { calls, result } = run({
      [primary]: [{ result: timeout() }],
      [fallback]: [{ result: timeout() }],
      [lastResort]: [{ result: "Too late." }],
    });
    await expect(result).rejects.toThrow("Request aborted");
    // 25 s, then the remaining 25 s; nothing is left for the last resort.
    expect(calls).toEqual([
      { model: primary, timeoutMs: 25_000 },
      { model: fallback, timeoutMs: 25_000 },
    ]);
  });

  it("shortens a request to the time left in the budget", async () => {
    const { calls, result } = run(
      {
        [primary]: [{ result: failure(503), ms: 20_000 }, { result: failure(503), ms: 20_000 }],
        [fallback]: [{ result: "Okay." }],
      },
      { budgetMs: 50_000 },
    );
    await expect(result).resolves.toBe("Okay.");
    // 20 s + 1 s backoff + 20 s leaves 9 s.
    expect(calls.map(({ timeoutMs }) => timeoutMs)).toEqual([25_000, 25_000, 9_000]);
  });

  it("fails without retrying a non-transient error, and after every model is exhausted", async () => {
    const blocked = run({ [primary]: [{ result: failure(400) }] });
    await expect(blocked.result).rejects.toThrow("HTTP 400");
    expect(blocked.models()).toEqual([primary]);

    const overloaded = (ms: number) => [
      { result: failure(503), ms },
      { result: failure(503), ms },
    ];
    const exhausted = run({
      [primary]: overloaded(100),
      [fallback]: overloaded(100),
      [lastResort]: overloaded(100),
    });
    await expect(exhausted.result).rejects.toThrow("HTTP 503");
    expect(exhausted.models()).toEqual([
      primary,
      primary,
      fallback,
      fallback,
      lastResort,
      lastResort,
    ]);
    expect(exhausted.failures).toHaveLength(6);
  });
});
