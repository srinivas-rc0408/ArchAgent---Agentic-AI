import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import OrchestrationPage from "./pages/OrchestrationPage";
import ShowcasePage from "./pages/ShowcasePage";
import DemoPage from "./pages/DemoPage";
import { GlobalLayout } from "./components/GlobalLayout";
import { LoadingProvider } from "./lib/LoadingContext";

export default function App() {
  return (
    <BrowserRouter>
      <LoadingProvider>
        <Routes>
          <Route element={<GlobalLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage onLogin={() => {}} />} />
            <Route path="/orchestration" element={<OrchestrationPage />} />
            <Route path="/showcase" element={<ShowcasePage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </LoadingProvider>
    </BrowserRouter>
  );
}
