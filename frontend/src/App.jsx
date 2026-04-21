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

import { colors, fonts } from "./styles/theme";

function HomePage() {
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
          padding: "64px 20px 56px",
          background: colors.gradHero,
          position: "relative",
          borderBottom: `1px solid ${colors.borderSoft}`,
        }}
      >
        <a
          href="/login"
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            padding: "10px 20px",
            background: colors.gradLagoon,
            color: "#fff",
            borderRadius: 10,
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: colors.shadowLagoon,
          }}
        >
          Area riservata →
        </a>
        <img
          src="/logo_zonca.jpg"
          alt="Logo Remiera Zonca"
          style={{
            width: 130,
            height: 130,
            borderRadius: "50%",
            objectFit: "cover",
            marginBottom: 20,
            boxShadow: "0 12px 32px rgba(8, 145, 178, 0.25)",
            border: `4px solid #fff`,
          }}
        />
        <h1
          style={{
            fontFamily: fonts.display,
            color: colors.foam,
            fontSize: 48,
            margin: 0,
            fontWeight: 700,
            letterSpacing: -1,
          }}
        >
          Remiera <span style={{ color: colors.lagoon }}>Zonca</span>
        </h1>
        <p
          style={{
            color: colors.muted,
            fontSize: 17,
            marginTop: 10,
            maxWidth: 520,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Scuola Padovana di Voga alla Veneta "Vittorio Zonca"
        </p>
      </header>

      <WeatherWidget />
      <DownloadAdesione />
      <ContactForm />
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
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
