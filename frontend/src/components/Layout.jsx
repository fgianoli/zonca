import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { colors, fonts } from "../styles/theme";
import ChangePasswordModal from "./ChangePasswordModal";

const navStyle = ({ isActive }) => ({
  padding: "10px 16px",
  color: isActive ? "#fff" : colors.muted,
  background: isActive ? colors.gradLagoon : "transparent",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 13,
  fontFamily: fonts.body,
  borderRadius: 10,
  whiteSpace: "nowrap",
  transition: "all .15s ease",
  boxShadow: isActive ? colors.shadowLagoon : "none",
});

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isAdmin = user?.role === "admin";
  const isPopeOrAdmin = user?.role === "admin" || user?.role === "pope";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.water,
        fontFamily: fonts.body,
        color: colors.foam,
      }}
    >
      {/* Header */}
      <header
        style={{
          background: colors.deep,
          borderBottom: `1px solid ${colors.borderSoft}`,
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          boxShadow: colors.shadowSoft,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src="/logo_zonca.jpg"
            alt="Zonca"
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              objectFit: "cover",
              boxShadow: "0 4px 12px rgba(8, 145, 178, 0.25)",
            }}
          />
          <div>
            <div
              style={{
                fontFamily: fonts.display,
                color: colors.foam,
                fontSize: 20,
                lineHeight: 1,
                fontWeight: 700,
              }}
            >
              Remiera <span style={{ color: colors.lagoon }}>Zonca</span>
            </div>
            <div style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>
              {user?.email} · <span style={{ color: colors.lagoon, fontWeight: 600 }}>{user?.role}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setShowChangePassword(true)}
            style={{
              padding: "9px 14px",
              background: "transparent",
              border: `1.5px solid ${colors.border}`,
              color: colors.foam,
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: fonts.body,
              transition: "all .15s ease",
            }}
            title="Cambia password"
          >
            🔑 Password
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: "9px 18px",
              background: "transparent",
              border: `1.5px solid ${colors.border}`,
              color: colors.foam,
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: fonts.body,
              transition: "all .15s ease",
            }}
          >
            Esci
          </button>
        </div>
      </header>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}

      {/* Nav */}
      <nav
        style={{
          backgroundColor: colors.deep,
          borderBottom: `1px solid ${colors.borderSoft}`,
          padding: "10px 28px",
          display: "flex",
          gap: 4,
          overflowX: "auto",
        }}
      >
        <NavLink to="/calendario" style={navStyle}>
          📅 Calendario
        </NavLink>
        <NavLink to="/flotta" style={navStyle}>
          ⛵ Flotta
        </NavLink>
        <NavLink to="/soci" style={navStyle}>
          👥 Soci
        </NavLink>
        <NavLink to="/prenotazioni" style={navStyle}>
          📋 Prenotazioni
        </NavLink>
        <NavLink to="/eventi" style={navStyle}>
          🎉 Eventi
        </NavLink>
        <NavLink to="/profilo" style={navStyle}>
          👤 Profilo
        </NavLink>
        {isPopeOrAdmin && (
          <NavLink to="/presenze" style={navStyle}>
            ✓ Presenze
          </NavLink>
        )}
        {isAdmin && (
          <>
            <NavLink to="/dashboard" style={navStyle}>
              📊 Dashboard
            </NavLink>
            <NavLink to="/economia" style={navStyle}>
              💰 Economia
            </NavLink>
            <NavLink to="/circolari" style={navStyle}>
              📣 Circolari
            </NavLink>
            <NavLink to="/utenti" style={navStyle}>
              🔐 Utenti
            </NavLink>
            <NavLink to="/impostazioni" style={navStyle}>
              ⚙️ Impostazioni
            </NavLink>
          </>
        )}
      </nav>

      {/* Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
