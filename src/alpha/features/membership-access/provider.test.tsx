import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MembershipAccessProvider } from "./provider";

const authKitProps = vi.hoisted(() => ({
  current: null as null | { devMode?: boolean },
}));

vi.mock("@workos-inc/authkit-react", () => ({
  AuthKitProvider: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    devMode?: boolean;
  }) => {
    authKitProps.current = props;
    return children;
  },
  useAuth: vi.fn(),
}));

vi.mock("convex/react", () => ({
  ConvexProviderWithAuth: ({ children }: { children: React.ReactNode }) =>
    children,
}));

describe("WorkOS provider", () => {
  it("persists the client-only session when no custom auth domain is configured", () => {
    renderToStaticMarkup(
      <MembershipAccessProvider client={{} as never}>
        App
      </MembershipAccessProvider>,
    );

    expect(authKitProps.current?.devMode).toBe(true);
  });
});
