import { v, type Infer } from "convex/values";

export const attemptEventKindValidator = v.union(
  v.literal("attempt_started"),
  v.literal("attempt_ended"),
  v.literal("learner_message"),
  v.literal("patient_message"),
);

// pending: a reply may still commit. failed: recoverable by retrying the same
// request. completed: its one patient reply is recorded. abandoned: no reply
// will ever be recorded (superseded by a new message, or the Attempt ended).
export const exchangeStatusValidator = v.union(
  v.literal("pending"),
  v.literal("failed"),
  v.literal("completed"),
  v.literal("abandoned"),
);

export const openExchangeValidator = v.object({
  clientRequestId: v.string(),
  status: v.union(v.literal("pending"), v.literal("failed")),
});

export const sendResultValidator = v.union(
  v.object({ status: v.literal("pending") }),
  v.object({ status: v.literal("completed") }),
  // Another message is still awaiting its reply.
  v.object({ status: v.literal("busy") }),
  v.object({ status: v.literal("abandoned") }),
  v.object({ status: v.literal("ended") }),
  v.object({ status: v.literal("not_found") }),
);

export type AttemptEventKind = Infer<typeof attemptEventKindValidator>;
export type OpenExchange = Infer<typeof openExchangeValidator>;
export type SendResult = Infer<typeof sendResultValidator>;
