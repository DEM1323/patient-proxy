import { describe, expect, it } from "vitest";
import { router } from "../router";

describe("deployment check route", () => {
  it("is registered as a direct SPA route", () => {
    expect(router.routesByPath["/deployment-check"]).toBeDefined();
  });

  it("registers direct AuthKit routes", () => {
    expect(router.routesByPath["/login"]).toBeDefined();
    expect(router.routesByPath["/callback"]).toBeDefined();
  });
});
