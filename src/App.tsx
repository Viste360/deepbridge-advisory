import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SiteShell } from "./components/SiteShell";
import {
  AboutPage,
  ClientsPage,
  ConsultantsPage,
  ExpertisePage,
  NotFoundPage,
  OpportunitiesPage,
} from "./pages/CorePages";
import { ContactPage } from "./pages/ContactPage";
import { HomePage } from "./pages/HomePage";
import { InsightArticlePage, InsightsPage } from "./pages/InsightsPages";
import {
  AccessibilityPage,
  CookiesPage,
  LegalNoticePage,
  PrivacyPage,
} from "./pages/LegalPages";

const PortalApp = lazy(() =>
  import("./portal/PortalApp").then((module) => ({ default: module.PortalApp })),
);

const portalPathPrefixes = [
  "/login",
  "/auth",
  "/dashboard",
  "/assignment",
  "/documents",
  "/compliance",
  "/onboarding",
  "/support",
  "/profile",
  "/admin",
  "/terms",
];

export default function App() {
  const portalHostname =
    window.location.hostname === "portal.deepbridgeadvisory.com" ||
    window.location.hostname.startsWith("portal.");
  const portalPath = portalPathPrefixes.some(
    (path) =>
      window.location.pathname === path ||
      window.location.pathname.startsWith(`${path}/`),
  );

  return (
    <BrowserRouter>
      {portalHostname || portalPath ? (
        <Suspense
          fallback={
            <div className="portal-loading" role="status" aria-live="polite">
              Loading secure portal…
            </div>
          }
        >
          <PortalApp />
        </Suspense>
      ) : (
        <SiteShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/expertise" element={<ExpertisePage />} />
            <Route path="/for-clients" element={<ClientsPage />} />
            <Route path="/for-consultants" element={<ConsultantsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/insights/:slug" element={<InsightArticlePage />} />
            <Route path="/opportunities" element={<OpportunitiesPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/cookies" element={<CookiesPage />} />
            <Route path="/legal" element={<LegalNoticePage />} />
            <Route path="/accessibility" element={<AccessibilityPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </SiteShell>
      )}
    </BrowserRouter>
  );
}
