import { v } from "convex/values";

// Why interaction stopped; never a performance outcome.
// learner_ended: the Learner's deliberate, confirmed ending (#13).
// learner_restarted: ended by confirming Start again (#9).
// access_suspended: the Membership was deactivated or lost the Learner role.
// Only learner_ended Attempts get an Attempt Debrief.
export const endReasonValidator = v.union(
  v.literal("learner_ended"),
  v.literal("learner_restarted"),
  v.literal("access_suspended"),
);
