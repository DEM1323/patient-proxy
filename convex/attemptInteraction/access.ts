import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { retryExchange, sendMessage } from "./model";
import { sendResultValidator } from "./validators";

// Attempt identifiers arrive from routes as plain strings so that malformed,
// foreign, and other Learners' identifiers all receive the same answer.
// Recorded messages and exchange state are read through attemptStart's
// ownAttempt query.
export const send = mutation({
  args: {
    attemptId: v.string(),
    clientRequestId: v.string(),
    text: v.string(),
  },
  returns: sendResultValidator,
  handler: sendMessage,
});

export const retry = mutation({
  args: { attemptId: v.string(), clientRequestId: v.string() },
  returns: sendResultValidator,
  handler: retryExchange,
});
