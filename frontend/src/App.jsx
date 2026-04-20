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

import { colors, fonts } from "./styles/theme";

function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.water,
        fontFamily: fonts.body,
      }}
    >
      <header
        style={{
          textAlign: "center",
          padding: "40px 20px 32px",
          borderBottom: `1px solid ${colors.lagoon}33`,
          position: "relative",
        }}
      >
        <a
          href="/login"
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            padding: "8px 18px",
            backgroundColor: colors.lagoon,
            color: "#fff",
            borderRadius: 6,
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Area riservata
        </a>
        <img
          src="/logo_zonca.jpg"
          alt="Logo Remiera Zonca"
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            objectFit: "cover",
            border: `3px solid ${colors.gold}`,
            marginBottom: 16,
          }}
        />
        <h1
          style={{
            fontFamily: fonts.display,
            color: colors.gold,
            fontSize: 36,
            margin: 0,
          }}
        >
          Remiera Zonca
        </h1>
        <p style={{ color: colors.muted, fontSize: 16, marginTop: 8 }}>
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
            <Route path="/impostazioni" element={<ImpostazioniPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
