import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { purgeExpiredAttempts } from "./model";

// Run daily by crons.ts. Continues in further batches until nothing expired
// remains.
export const run = internalMutation({
  args: {},
  returns: v.object({
    endedDeleted: v.number(),
    activeDeleted: v.number(),
    more: v.boolean(),
  }),
  handler: async (ctx) => {
    const result = await purgeExpiredAttempts(ctx);
    if (result.more) {
      await ctx.scheduler.runAfter(0, internal.retention.purge.run, {});
    }
    return result;
  },
});
