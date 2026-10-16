import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { LocaleProvider, locales, localizePath } from "./i18n";
import { SiteShell } from "./components/SiteShell";
import { isPortalLocation } from "./config/appRouting";
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

export default function App() {
  return (
    <BrowserRouter>
      <ApplicationRoutes />
    </BrowserRouter>
  );
}

function ApplicationRoutes() {
  const { pathname, search } = useLocation();
  const portal = isPortalLocation(window.location.hostname, pathname, search);

  return portal ? (
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
    <SiteRoutes />
  );
}


// Shared route tree for the browser and build-time public-page rendering.
export function SiteRoutes() {
  const pages = [
    ["/", <HomePage />],
    ["/expertise", <ExpertisePage />],
    ["/for-clients", <ClientsPage />],
    ["/for-consultants", <ConsultantsPage />],
    ["/about", <AboutPage />],
    ["/insights", <InsightsPage />],
    ["/insights/:slug", <InsightArticlePage />],
    ["/opportunities", <OpportunitiesPage />],
    ["/contact", <ContactPage />],
    ["/privacy", <PrivacyPage />],
    ["/cookies", <CookiesPage />],
    ["/legal", <LegalNoticePage />],
    ["/accessibility", <AccessibilityPage />],
  ] as const;
  return <LocaleProvider><SiteShell><Routes>
    {pages.flatMap(([path, element]) => locales.map((locale) =>
      <Route key={`${locale}${path}`} path={localizePath(path, locale)} element={element} />,
    ))}
    <Route path="*" element={<NotFoundPage />} />
  </Routes></SiteShell></LocaleProvider>;
}
