import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { RouteErrorPage } from "../pages/RouteErrorPage";
import { SignOutPage } from "../pages/SignOutPage";

const AdminAgenciesPage = lazy(() =>
  import("../pages/AdminAgenciesPage").then((module) => ({ default: module.AdminAgenciesPage })),
);
const AdminAgencyDocumentsPage = lazy(() =>
  import("../pages/AdminAgencyDocumentsPage").then((module) => ({
    default: module.AdminAgencyDocumentsPage,
  })),
);
const AdminBailRequestsPage = lazy(() =>
  import("../pages/AdminBailRequestsPage").then((module) => ({
    default: module.AdminBailRequestsPage,
  })),
);
const AdminDashboardPage = lazy(() =>
  import("../pages/AdminDashboardPage").then((module) => ({ default: module.AdminDashboardPage })),
);
const AttorneysPage = lazy(() =>
  import("../pages/AttorneysPage").then((module) => ({ default: module.AttorneysPage })),
);
const AgencyDashboardPage = lazy(() =>
  import("../pages/AgencyDashboardPage").then((module) => ({ default: module.AgencyDashboardPage })),
);
const AgencyLeadsPage = lazy(() =>
  import("../pages/AgencyLeadsPage").then((module) => ({ default: module.AgencyLeadsPage })),
);
const AgencyOnboardingPage = lazy(() =>
  import("../pages/AgencyOnboardingPage").then((module) => ({
    default: module.AgencyOnboardingPage,
  })),
);
const ConsumerDashboardPage = lazy(() =>
  import("../pages/ConsumerDashboardPage").then((module) => ({
    default: module.ConsumerDashboardPage,
  })),
);
const ConsumerRequestDetailPage = lazy(() =>
  import("../pages/ConsumerRequestDetailPage").then((module) => ({
    default: module.ConsumerRequestDetailPage,
  })),
);
const GetHelpNowPage = lazy(() =>
  import("../pages/GetHelpNowPage").then((module) => ({ default: module.GetHelpNowPage })),
);
const LandingPage = lazy(() =>
  import("../pages/LandingPage").then((module) => ({ default: module.LandingPage })),
);
const NotFoundPage = lazy(() =>
  import("../pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })),
);
const SignInPage = lazy(() =>
  import("../pages/SignInPage").then((module) => ({ default: module.SignInPage })),
);
const SignUpPage = lazy(() =>
  import("../pages/SignUpPage").then((module) => ({ default: module.SignUpPage })),
);

function BailXLoading() {
  return (
    <section className="page-section narrow">
      <article className="card empty-state-card">
        <p className="eyebrow">BailX</p>
        <h1>Loading BailX...</h1>
        <p>Preparing the next page.</p>
      </article>
    </section>
  );
}

function lazyPage(page: ReactNode) {
  return <Suspense fallback={<BailXLoading />}>{page}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: "/", element: lazyPage(<LandingPage />) },
      { path: "/get-help-now", element: lazyPage(<GetHelpNowPage />) },
      { path: "/attorneys", element: lazyPage(<AttorneysPage />) },
      { path: "/auth/sign-in", element: lazyPage(<SignInPage />) },
      { path: "/auth/sign-up", element: lazyPage(<SignUpPage />) },
      { path: "/auth/sign-out", element: <SignOutPage /> },
      {
        element: <ProtectedRoute roles={["consumer"]} />,
        children: [
          { path: "/consumer/dashboard", element: lazyPage(<ConsumerDashboardPage />) },
        ],
      },
      {
        element: <ProtectedRoute roles={["consumer", "admin"]} />,
        children: [
          { path: "/consumer/requests/:id", element: lazyPage(<ConsumerRequestDetailPage />) },
        ],
      },
      {
        element: <ProtectedRoute roles={["agency"]} />,
        children: [
          { path: "/agency/onboarding", element: lazyPage(<AgencyOnboardingPage />) },
          { path: "/agency/dashboard", element: lazyPage(<AgencyDashboardPage />) },
          { path: "/agency/leads", element: lazyPage(<AgencyLeadsPage />) },
        ],
      },
      {
        element: <ProtectedRoute roles={["admin"]} />,
        children: [
          { path: "/admin/dashboard", element: lazyPage(<AdminDashboardPage />) },
          { path: "/admin/agencies", element: lazyPage(<AdminAgenciesPage />) },
          {
            path: "/admin/agency-documents",
            element: lazyPage(<AdminAgencyDocumentsPage />),
          },
          { path: "/admin/bail-requests", element: lazyPage(<AdminBailRequestsPage />) },
        ],
      },
      { path: "*", element: lazyPage(<NotFoundPage />) },
    ],
  },
]);
