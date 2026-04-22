import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

// Components
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import ContactForm from "./components/ContactForm";
import DownloadAdesione from "./components/DownloadAdesione";
import WeatherWidget from "./components/WeatherWidget";

// Pages
import LoginPage from "./pages/LoginPage";
import CalendarioPage from "./pages/CalendarioPage";
import FlottaPage from "./pages/FlottaPage";
import SociPage from "./pages/SociPage";
import PrenotazioniPage from "./pages/PrenotazioniPage";
import PresenzePage from "./pages/PresenzePage";
import DashboardPage from "./pages/DashboardPage";
import EconomiaPage from "./pages/EconomiaPage";
import CircolariPage from "./pages/CircolariPage";
import ImpostazioniPage from "./pages/ImpostazioniPage";
import UtentiPage from "./pages/UtentiPage";
import ProfiloPage from "./pages/ProfiloPage";
import EventiPage from "./pages/EventiPage";
import MappaPage from "./pages/MappaPage";
import EquipaggiPage from "./pages/EquipaggiPage";
import GalleryPage from "./pages/GalleryPage";
import PrivacyPage from "./pages/PrivacyPage";
import FatturePage from "./pages/FatturePage";
import TemplateEmailPage from "./pages/TemplateEmailPage";
import BackupsPage from "./pages/BackupsPage";
import GdprRequestsPage from "./pages/GdprRequestsPage";
import CookieBanner from "./components/CookieBanner";

import { colors, fonts } from "./styles/theme";
import { useIsMobile } from "./hooks/useMediaQuery";

function HomePage() {
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.water,
        fontFamily: fonts.body,
        color: colors.foam,
      }}
    >
      <header
        style={{
          textAlign: "center",
          padding: isMobile ? "20px 16px 32px" : "64px 20px 56px",
          background: colors.gradHero,
          position: "relative",
          borderBottom: `1px solid ${colors.borderSoft}`,
        }}
      >
        {/* Su mobile i bottoni sono in una barra top-right flottante */}
        <div
          style={{
            position: isMobile ? "static" : "absolute",
            top: isMobile ? "auto" : 24,
            right: isMobile ? "auto" : 24,
            display: "flex",
            gap: isMobile ? 8 : 10,
            justifyContent: "center",
            marginBottom: isMobile ? 20 : 0,
            flexWrap: "wrap",
          }}
        >
          <a
            href="/mappa"
            style={{
              padding: isMobile ? "8px 14px" : "10px 18px",
              background: "#ffffffcc",
              backdropFilter: "blur(8px)",
              color: colors.foam,
              borderRadius: 10,
              textDecoration: "none",
              fontSize: isMobile ? 12 : 13,
              fontWeight: 600,
              border: `1px solid ${colors.border}`,
            }}
          >
            🗺 Itinerari
          </a>
          <a
            href="/login"
            style={{
              padding: isMobile ? "8px 14px" : "10px 20px",
              background: colors.gradLagoon,
              color: "#fff",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: isMobile ? 12 : 13,
              fontWeight: 600,
              boxShadow: colors.shadowLagoon,
            }}
          >
            Area riservata →
          </a>
        </div>
        <img
          src="/logo_zonca.png"
          alt="Logo Remiera Zonca"
          style={{
            height: isMobile ? 100 : 140,
            width: "auto",
            objectFit: "contain",
            marginBottom: 16,
            filter: "drop-shadow(0 8px 24px rgba(8, 145, 178, 0.18))",
          }}
        />
        <h1
          style={{
            fontFamily: fonts.display,
            color: colors.foam,
            fontSize: isMobile ? 32 : 48,
            margin: 0,
            fontWeight: 700,
            letterSpacing: -1,
            lineHeight: 1.1,
          }}
        >
          Remiera <span style={{ color: colors.lagoon }}>Zonca</span>
        </h1>
        <p
          style={{
            color: colors.muted,
            fontSize: isMobile ? 14 : 17,
            marginTop: 10,
            maxWidth: 520,
            marginLeft: "auto",
            marginRight: "auto",
            padding: isMobile ? "0 8px" : 0,
          }}
        >
          Scuola Padovana di Voga alla Veneta "Vittorio Zonca"
        </p>
      </header>

      <WeatherWidget />
      <DownloadAdesione />
      <ContactForm />
      <footer
        style={{
          textAlign: "center",
          padding: isMobile ? "20px 16px 32px" : "28px 20px 40px",
          color: colors.muted,
          fontSize: 12,
          borderTop: `1px solid ${colors.borderSoft}`,
          marginTop: 20,
        }}
      >
        <a
          href="/privacy"
          style={{ color: colors.lagoon, textDecoration: "none", fontWeight: 600 }}
        >
          🛡 Privacy Policy
        </a>
        <div style={{ marginTop: 6 }}>
          © {new Date().getFullYear()} Scuola Padovana di Voga alla Veneta "Vittorio Zonca" ASD
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/mappa" element={<MappaPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* Protected - all authenticated users */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/calendario" element={<CalendarioPage />} />
            <Route path="/flotta" element={<FlottaPage />} />
            <Route path="/soci" element={<SociPage />} />
            <Route path="/prenotazioni" element={<PrenotazioniPage />} />
            <Route path="/eventi" element={<EventiPage />} />
            <Route path="/equipaggi" element={<EquipaggiPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/profilo" element={<ProfiloPage />} />
          </Route>

          {/* Protected - pope+admin */}
          <Route
            element={
              <ProtectedRoute roles={["admin", "pope"]}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/presenze" element={<PresenzePage />} />
          </Route>

          {/* Protected - admin only */}
          <Route
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/economia" element={<EconomiaPage />} />
            <Route path="/circolari" element={<CircolariPage />} />
            <Route path="/utenti" element={<UtentiPage />} />
            <Route path="/impostazioni" element={<ImpostazioniPage />} />
            <Route path="/admin/fatture" element={<FatturePage />} />
            <Route path="/admin/email-templates" element={<TemplateEmailPage />} />
            <Route path="/admin/backup" element={<BackupsPage />} />
            <Route path="/admin/gdpr" element={<GdprRequestsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <CookieBanner />
      </AuthProvider>
    </BrowserRouter>
  );
}
