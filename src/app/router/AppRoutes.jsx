import React, { Suspense, lazy, useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { MainLayout } from "@app/layouts/Layout";
import RouteErrorBoundary from "@app/error-boundaries/RouteErrorBoundary";
import { useStore } from "@app/store/useStore";
import { isInternalSingleUserMode } from "@infrastructure/http/client";

const ROUTE_LOADERS = {
  "/builder": () => import("@modules/charts/pages/Builder.jsx"),
  "/dashboard": () => import("@modules/dashboards/current/DashboardCanvasBuilder.jsx"),
  // Preserve the established designer surface.  Its production data path is
  // API-backed; mock-only branches remain gated inside the module.
  "/dashboard-v2": () => import("@modules/dashboards/designer-v2/pages/index.tsx"),
  "/dashboard-legacy": () => import("@modules/dashboards/legacy/pages/DashboardPage.jsx"),
  "/dashboard-public": () => import("@modules/sharing/pages/DashboardPublicPage.jsx"),
  "/connections": () => import("@modules/connections/pages/DatabaseConnectionPage.jsx"),
  "/datasets": () => import("@modules/datasets/pages/DatasetsPage.jsx"),
  "/home": () => import("@modules/projects/pages/HomePage.jsx"),
  "/login": () => import("@modules/auth/pages/LoginPage"),
  "/register": () => import("@modules/auth/pages/RegisterPage"),
  "/settings": () => import("@modules/settings/pages/SettingsPage.jsx"),
  "/share": () => import("@modules/sharing/pages/SharePage"),
};

const ROUTE_PRELOADERS = {
  ...ROUTE_LOADERS,
  "/dashboard-v2": () => ROUTE_LOADERS["/dashboard-v2"](),
};

const BuilderPage = lazy(ROUTE_LOADERS["/builder"]);
const DashboardCanvasBuilder = lazy(ROUTE_LOADERS["/dashboard"]);
const DashboardDesignerV2 = lazy(ROUTE_LOADERS["/dashboard-v2"]);
const DashboardPage = lazy(ROUTE_LOADERS["/dashboard-legacy"]);
const DashboardPublicPage = lazy(ROUTE_LOADERS["/dashboard-public"]);
const DatabaseConnectionPage = lazy(ROUTE_LOADERS["/connections"]);
const DatasetsPage = lazy(ROUTE_LOADERS["/datasets"]);
const HomePage = lazy(ROUTE_LOADERS["/home"]);
const LoginPage = lazy(ROUTE_LOADERS["/login"]);
const RegisterPage = lazy(ROUTE_LOADERS["/register"]);
const SettingsPage = lazy(ROUTE_LOADERS["/settings"]);
const SharePage = lazy(ROUTE_LOADERS["/share"]);

function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        color: "var(--muted)",
        background: "var(--app-bg)",
      }}
    >
      Loading workspace...
    </div>
  );
}

function ProtectedRoute() {
  const location = useLocation();
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const authStatus = useStore((state) => state.authStatus);

  if (authStatus === "loading") return <RouteFallback />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function PublicAuthRoute({ children }) {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const authStatus = useStore((state) => state.authStatus);

  if (authStatus === "loading") return <RouteFallback />;

  if (isInternalSingleUserMode() && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function withRouteBoundary(element) {
  return <RouteErrorBoundary>{element}</RouteErrorBoundary>;
}

export default function AppRoutes() {
  useEffect(() => {
    const preloadRoute = (event) => {
      const pathname = event.detail?.pathname;
      const loader = ROUTE_PRELOADERS[pathname];
      if (loader) void loader().catch(() => undefined);
    };
    window.addEventListener("mini-bi:preload-route", preloadRoute);
    return () => window.removeEventListener("mini-bi:preload-route", preloadRoute);
  }, []);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<PublicAuthRoute>{withRouteBoundary(<LoginPage />)}</PublicAuthRoute>} />
        <Route path="/register" element={<PublicAuthRoute>{withRouteBoundary(<RegisterPage />)}</PublicAuthRoute>} />
        <Route path="/share/:sheetId" element={withRouteBoundary(<SharePage />)} />
        <Route path="/dashboard/:dashboardId/view" element={withRouteBoundary(<DashboardPublicPage />)} />
        <Route path="/dashboard/:dashboardId/embed" element={withRouteBoundary(<DashboardPublicPage />)} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={withRouteBoundary(<HomePage />)} />
            <Route path="/home" element={withRouteBoundary(<HomePage />)} />
            <Route path="/dashboard" element={withRouteBoundary(<DashboardCanvasBuilder />)} />
            <Route path="/dashboard-v2" element={withRouteBoundary(<DashboardDesignerV2 />)} />
            <Route path="/dashboard-legacy" element={withRouteBoundary(<DashboardPage />)} />
            <Route path="/builder" element={withRouteBoundary(<BuilderPage />)} />
            <Route path="/connections" element={withRouteBoundary(<DatabaseConnectionPage />)} />
            <Route path="/datasets" element={withRouteBoundary(<DatasetsPage />)} />
            <Route path="/settings" element={withRouteBoundary(<SettingsPage />)} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
}
