import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { colors, fonts } from "../styles/theme";

const navStyle = ({ isActive }) => ({
  padding: "10px 18px",
  color: isActive ? colors.gold : colors.foam,
  borderBottom: `3px solid ${isActive ? colors.gold : "transparent"}`,
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 14,
  fontFamily: fonts.body,
  transition: "color .2s, border-color .2s",
});

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
          backgroundColor: colors.deep,
          borderBottom: `2px solid ${colors.gold}`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
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
              border: `2px solid ${colors.gold}`,
            }}
          />
          <div>
            <div
              style={{
                fontFamily: fonts.display,
                color: colors.gold,
                fontSize: 20,
                lineHeight: 1,
              }}
            >
              Remiera Zonca
            </div>
            <div style={{ color: colors.muted, fontSize: 11 }}>
              {user?.email} — {user?.role}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: "8px 16px",
            background: "transparent",
            border: `1px solid ${colors.lagoon}`,
            color: colors.foam,
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Esci
        </button>
      </header>

      {/* Nav */}
      <nav
        style={{
          backgroundColor: colors.deep,
          borderBottom: `1px solid ${colors.lagoon}33`,
          padding: "0 24px",
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
