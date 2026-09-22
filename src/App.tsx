import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GlobalLayout } from "./components/GlobalLayout";
import { LoadingProvider } from "./lib/LoadingContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

// The landing page is the entry point for nearly every visit, so it ships in
// the main chunk. Everything else — and especially the workspace, which drags
// in three.js and jsPDF — is split out and fetched on navigation.
import HomePage from "./pages/HomePage";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const OrchestrationPage = lazy(() => import("./pages/OrchestrationPage"));
const ShowcasePage = lazy(() => import("./pages/ShowcasePage"));

/** Route-level placeholder. Deliberately minimal — the layout behind it is already painted. */
function RouteFallback() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <div className="h-10 w-10 rounded-full border border-white/10 border-t-white animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LoadingProvider>
        <ErrorBoundary>
          <Routes>
            <Route element={<GlobalLayout />}>
              <Route index element={<HomePage />} />
              <Route
                path="login"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <LoginPage onLogin={() => {}} />
                  </Suspense>
                }
              />
              <Route
                path="orchestration"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <OrchestrationPage />
                  </Suspense>
                }
              />
              <Route
                path="showcase"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <ShowcasePage />
                  </Suspense>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </LoadingProvider>
    </BrowserRouter>
  );
}
