import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { RouterProvider } from "@tanstack/react-router";
import {
  convexUrl,
  isConvexConfigured,
  isMembershipAccessConfigured,
} from "./env";
import { MembershipAccessProvider } from "./features/membership-access/provider";
import { router } from "./router";
import "./styles.css";

const root = createRoot(document.getElementById("root")!);
const app = <RouterProvider router={router} />;
const convexClient = isConvexConfigured ? new ConvexReactClient(convexUrl) : null;

root.render(
  <StrictMode>
    {isMembershipAccessConfigured && convexClient ? (
      <MembershipAccessProvider client={convexClient}>
        {app}
      </MembershipAccessProvider>
    ) : convexClient ? (
      <ConvexProvider client={convexClient}>{app}</ConvexProvider>
    ) : (
      app
    )}
  </StrictMode>,
);
