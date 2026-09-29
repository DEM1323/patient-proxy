import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { DeploymentCheckPage } from "./routes/deployment-check";
import { HomePage } from "./routes/home";
import {
  AttemptPage,
  LearnerBriefPage,
  ScenarioListPage,
} from "./features/attempt-start";
import { AttemptHistoryPage } from "./features/learner-attempt-history";
import { ReviewDetailPage, ReviewListPage } from "./features/attempt-review";
import {
  CallbackPage,
  LoginPage,
} from "./features/membership-access/auth-routes";

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <nav
          aria-label="Primary navigation"
          className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"
        >
          <Link to="/" className="text-lg font-semibold tracking-tight text-primary">
            Patient Proxy
          </Link>
          <Link
            to="/deployment-check"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            activeProps={{ className: "bg-slate-100 text-primary" }}
          >
            Deployment check
          </Link>
        </nav>
      </header>
      <Outlet />
    </div>
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const deploymentCheckRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/deployment-check",
  component: DeploymentCheckPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const callbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/callback",
  component: CallbackPage,
});

const scenarioListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scenarios",
  component: ScenarioListPage,
});

const learnerBriefRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scenarios/$scenarioId",
  component: function LearnerBriefRoute() {
    const { scenarioId } = learnerBriefRoute.useParams();
    return <LearnerBriefPage key={scenarioId} scenarioId={scenarioId} />;
  },
});

const attemptHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/attempts",
  component: AttemptHistoryPage,
});

const attemptRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/attempts/$attemptId",
  component: function AttemptRoute() {
    const { attemptId } = attemptRoute.useParams();
    return <AttemptPage attemptId={attemptId} />;
  },
});

const reviewListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/review",
  component: ReviewListPage,
});

const reviewDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/review/$attemptId",
  component: function ReviewDetailRoute() {
    const { attemptId } = reviewDetailRoute.useParams();
    return <ReviewDetailPage attemptId={attemptId} />;
  },
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  deploymentCheckRoute,
  loginRoute,
  callbackRoute,
  scenarioListRoute,
  learnerBriefRoute,
  attemptHistoryRoute,
  attemptRoute,
  reviewListRoute,
  reviewDetailRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
