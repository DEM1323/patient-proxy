import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { isConvexConfigured } from "../env";

const healthCheck = makeFunctionReference<
  "query",
  Record<string, never>,
  { service: string; status: "ready" }
>("health:check");

function ConvexStatus() {
  const health = useQuery(healthCheck);

  return (
    <StatusRow
      label="Convex backend"
      status={health?.status === "ready" ? "Ready" : "Connecting"}
      ready={health?.status === "ready"}
    />
  );
}

function StatusRow({
  label,
  status,
  ready,
}: {
  label: string;
  status: string;
  ready: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-0">
      <span className="font-medium text-slate-800">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          ready
            ? "bg-emerald-100 text-emerald-800"
            : "bg-amber-100 text-amber-900"
        }`}
        role="status"
      >
        {status}
      </span>
    </li>
  );
}

export function DeploymentCheckPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
        Slice 1
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">Deployment spine</h1>
      <p className="mt-4 text-slate-600">
        This route is intentionally safe to open directly. Cloudflare serves the
        SPA entry point, TanStack Router restores this route, and Convex supplies
        the backend status.
      </p>
      <ul className="mt-8 rounded-xl border border-slate-200 bg-white px-6 shadow-sm">
        <StatusRow label="Vite application" status="Ready" ready />
        <StatusRow label="TanStack Router" status="Ready" ready />
        <StatusRow label="Cloudflare SPA fallback" status="Configured" ready />
        {isConvexConfigured ? (
          <ConvexStatus />
        ) : (
          <StatusRow
            label="Convex backend"
            status="Set VITE_CONVEX_URL"
            ready={false}
          />
        )}
      </ul>
    </main>
  );
}
