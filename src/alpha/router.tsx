import {
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
import { MembersPage } from "./features/institution-admin";
import { LearningGroupsPage } from "./features/learning-groups";
import {
  AuthoringListPage,
  DebriefEditorPage,
} from "./features/scenario-authoring";
import { AppShell } from "./features/membership-access/navigation";
import { isMembershipAccessConfigured } from "./env";
import {
  CallbackPage,
  LoginPage,
} from "./features/membership-access/auth-routes";

// Every page renders inside the shell; the deployment check stays reachable
// by URL but is no longer a navigation destination.
const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-canvas text-ink">
      {isMembershipAccessConfigured ? (
        <AppShell>
          <Outlet />
        </AppShell>
      ) : (
        <Outlet />
      )}
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

const membersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/members",
  component: MembersPage,
});

const learningGroupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/groups",
  component: LearningGroupsPage,
});

const authoringRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/authoring",
  component: AuthoringListPage,
});

const debriefEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/authoring/$scenarioId",
  component: function DebriefEditorRoute() {
    const { scenarioId } = debriefEditorRoute.useParams();
    return <DebriefEditorPage key={scenarioId} scenarioId={scenarioId} />;
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
  membersRoute,
  learningGroupsRoute,
  authoringRoute,
  debriefEditorRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
