import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { AdminAgenciesPage } from "../pages/AdminAgenciesPage";
import { AdminAgencyDocumentsPage } from "../pages/AdminAgencyDocumentsPage";
import { AdminBailRequestsPage } from "../pages/AdminBailRequestsPage";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { AttorneysPage } from "../pages/AttorneysPage";
import { AgencyDashboardPage } from "../pages/AgencyDashboardPage";
import { AgencyLeadsPage } from "../pages/AgencyLeadsPage";
import { AgencyOnboardingPage } from "../pages/AgencyOnboardingPage";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { ConsumerDashboardPage } from "../pages/ConsumerDashboardPage";
import { ConsumerRequestDetailPage } from "../pages/ConsumerRequestDetailPage";
import { GetHelpNowPage } from "../pages/GetHelpNowPage";
import { LandingPage } from "../pages/LandingPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RouteErrorPage } from "../pages/RouteErrorPage";
import { SignInPage } from "../pages/SignInPage";
import { SignOutPage } from "../pages/SignOutPage";
import { SignUpPage } from "../pages/SignUpPage";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/get-help-now", element: <GetHelpNowPage /> },
      { path: "/attorneys", element: <AttorneysPage /> },
      { path: "/auth/sign-in", element: <SignInPage /> },
      { path: "/auth/sign-up", element: <SignUpPage /> },
      { path: "/auth/sign-out", element: <SignOutPage /> },
      {
        element: <ProtectedRoute roles={["consumer"]} />,
        children: [{ path: "/consumer/dashboard", element: <ConsumerDashboardPage /> }],
      },
      {
        element: <ProtectedRoute roles={["consumer", "admin"]} />,
        children: [{ path: "/consumer/requests/:id", element: <ConsumerRequestDetailPage /> }],
      },
      {
        element: <ProtectedRoute roles={["agency"]} />,
        children: [
          { path: "/agency/onboarding", element: <AgencyOnboardingPage /> },
          { path: "/agency/dashboard", element: <AgencyDashboardPage /> },
          { path: "/agency/leads", element: <AgencyLeadsPage /> },
        ],
      },
      {
        element: <ProtectedRoute roles={["admin"]} />,
        children: [
          { path: "/admin/dashboard", element: <AdminDashboardPage /> },
          { path: "/admin/agencies", element: <AdminAgenciesPage /> },
          { path: "/admin/agency-documents", element: <AdminAgencyDocumentsPage /> },
          { path: "/admin/bail-requests", element: <AdminBailRequestsPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
