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
import {
  AccessibilityPage,
  CookiesPage,
  LegalNoticePage,
  PrivacyPage,
} from "./pages/LegalPages";

export default function App() {
  return (
    <BrowserRouter>
      <SiteShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/expertise" element={<ExpertisePage />} />
          <Route path="/for-clients" element={<ClientsPage />} />
          <Route path="/for-consultants" element={<ConsultantsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/cookies" element={<CookiesPage />} />
          <Route path="/legal" element={<LegalNoticePage />} />
          <Route path="/accessibility" element={<AccessibilityPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </SiteShell>
    </BrowserRouter>
  );
}
