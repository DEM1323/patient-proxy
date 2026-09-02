import { queryGeneric } from "convex/server";

export const check = queryGeneric({
  args: {},
  handler: () => ({
    service: "convex",
    status: "ready" as const,
  }),
});
