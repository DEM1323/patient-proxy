import { v } from "convex/values";
import { query } from "../_generated/server";
import { timelineEntryValidator } from "../attemptStart/access";
import {
  feedbackSectionsValidator,
  reflectionPromptKeyValidator,
  reflectionResponseValidator,
} from "../attemptDebrief/validators";
import { getReviewDetail, listReviewableAttempts } from "./model";

const endReasonValidator = v.union(
  v.literal("learner_ended"),
  v.literal("learner_restarted"),
);

// Scope is recomputed on every read from current Learning Group membership
// and Scenario availability (Faculty) or the Pilot Institution
// (Institutional Admin).
export const reviewableAttempts = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("attempts"),
      learnerEmail: v.string(),
      scenarioTitle: v.string(),
      scenarioVersion: v.number(),
      endedAt: v.number(),
      endReason: endReasonValidator,
      debrief: v.union(
        v.literal("none"),
        v.literal("reflecting"),
        v.literal("complete"),
      ),
    }),
  ),
  handler: listReviewableAttempts,
});

// Attempt identifiers arrive from routes as plain strings so that malformed,
// foreign, Active, and unauthorized identifiers all receive the same null.
export const reviewAttempt = query({
  args: { attemptId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      learnerEmail: v.string(),
      attempt: v.object({
        id: v.id("attempts"),
        startedAt: v.number(),
        endedAt: v.union(v.null(), v.number()),
        endReason: v.union(v.null(), endReasonValidator),
        scenario: v.object({
          title: v.string(),
          patientName: v.string(),
          setting: v.string(),
          version: v.number(),
        }),
        timeline: v.array(timelineEntryValidator),
      }),
      debrief: v.union(
        v.object({ status: v.literal("none") }),
        v.object({
          status: v.literal("recorded"),
          prompts: v.array(
            v.object({
              key: reflectionPromptKeyValidator,
              text: v.union(v.null(), v.string()),
              responses: v.array(
                v.object({
                  response: reflectionResponseValidator,
                  text: v.union(v.null(), v.string()),
                  submittedAt: v.number(),
                }),
              ),
            }),
          ),
          feedback: v.union(
            v.object({
              status: v.union(
                v.literal("not_started"),
                v.literal("pending"),
                v.literal("failed"),
              ),
            }),
            v.object({
              status: v.literal("completed"),
              sections: feedbackSectionsValidator,
            }),
          ),
        }),
      ),
    }),
  ),
  handler: (ctx, { attemptId }) => getReviewDetail(ctx, attemptId),
});
