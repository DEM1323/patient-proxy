import {
  GoogleGenerativeAIAbortError,
  GoogleGenerativeAIFetchError,
} from "@google/generative-ai";
import { describe, expect, it, vi } from "vitest";
import { patientModels, withModelFallback } from "./gemini";

const failure = (status: number) =>
  new GoogleGenerativeAIFetchError(`HTTP ${status}`, status);

function run(outcomes: Record<string, (Error | string)[]>) {
  const calls: string[] = [];
  const sleep = vi.fn(async () => undefined);
  const call = async (model: string) => {
    calls.push(model);
    const outcome = outcomes[model]?.shift() ?? failure(500);
    if (outcome instanceof Error) {
      throw outcome;
    }
    return outcome;
  };
  return { calls, sleep, result: withModelFallback(call, sleep) };
}

const [primary, fallback] = patientModels;

describe("Gemini model fallback", () => {
  it("prefers gemini-3.5-flash with gemini-3.1-flash-lite as the fallback", () => {
    expect(patientModels).toEqual(["gemini-3.5-flash", "gemini-3.1-flash-lite"]);
  });

  it("retries an overloaded model once before succeeding", async () => {
    const { calls, sleep, result } = run({ [primary]: [failure(503), "Mm... hi."] });
    await expect(result).resolves.toBe("Mm... hi.");
    expect(calls).toEqual([primary, primary]);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("falls back when the preferred model stays overloaded, is rate limited, or times out", async () => {
    for (const primaryFailures of [
      [failure(503), failure(503)],
      [failure(429)],
      [new GoogleGenerativeAIAbortError("Request aborted")],
    ]) {
      const { calls, result } = run({
        [primary]: [...primaryFailures],
        [fallback]: ["I'm not sure."],
      });
      await expect(result).resolves.toBe("I'm not sure.");
      expect(calls).toEqual([...primaryFailures.map(() => primary), fallback]);
    }
  });

  it("fails without retrying a non-transient error, and after every model is exhausted", async () => {
    const blocked = run({ [primary]: [failure(400)] });
    await expect(blocked.result).rejects.toThrow("HTTP 400");
    expect(blocked.calls).toEqual([primary]);

    const exhausted = run({
      [primary]: [failure(503), failure(503)],
      [fallback]: [failure(503), failure(503)],
    });
    await expect(exhausted.result).rejects.toThrow("HTTP 503");
    expect(exhausted.calls).toEqual([primary, primary, fallback, fallback]);
  });
});
