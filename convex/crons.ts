import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Approved retention policy; see retention/model.ts.
crons.daily(
  "delete expired Attempts",
  { hourUTC: 7, minuteUTC: 0 },
  internal.retention.purge.run,
  {},
);

export default crons;
