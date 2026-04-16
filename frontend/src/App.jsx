import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ContactForm from "./components/ContactForm";
import DownloadAdesione from "./components/DownloadAdesione";
import { colors, fonts } from "./styles/theme";

function LoginPage() {
  return <div style={{ color: colors.foam, padding: 40 }}>Login Page (TODO)</div>;
}

function HomePage() {
  return (
    <div>
      {/* Hero */}
      <header
        style={{
          textAlign: "center",
          padding: "40px 20px 32px",
          borderBottom: `1px solid ${colors.lagoon}33`,
        }}
      >
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
        <p
          style={{
            color: colors.muted,
            fontSize: 16,
            marginTop: 8,
          }}
        >
          Scuola Padovana di Voga alla Veneta "Vittorio Zonca"
        </p>
      </header>

      {/* Download Modulo Adesione */}
      <DownloadAdesione />

      {/* Contact Form */}
      <ContactForm />
    </div>
  );
}

function DashboardPage() {
  return (
    <div style={{ color: colors.foam, padding: 40 }}>
      Dashboard - Remiera Zonca (TODO: migrare componenti dal prototipo)
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: colors.water,
            fontFamily: fonts.body,
          }}
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
