import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { colors, fonts } from "../styles/theme";
import { useIsMobile } from "../hooks/useMediaQuery";
import ChangePasswordModal from "./ChangePasswordModal";

const NAV_ITEMS = [
  { to: "/calendario", label: "Calendario", icon: "📅", roles: ["all"] },
  { to: "/flotta", label: "Flotta", icon: "⛵", roles: ["all"] },
  { to: "/soci", label: "Soci", icon: "👥", roles: ["all"] },
  { to: "/prenotazioni", label: "Prenotazioni", icon: "📋", roles: ["all"] },
  { to: "/equipaggi", label: "Equipaggi", icon: "🚣", roles: ["all"] },
  { to: "/eventi", label: "Eventi", icon: "🎉", roles: ["all"] },
  { to: "/mappa", label: "Mappa", icon: "🗺", roles: ["all"] },
  { to: "/gallery", label: "Gallery", icon: "📸", roles: ["all"] },
  { to: "/profilo", label: "Profilo", icon: "👤", roles: ["all"] },
  { to: "/presenze", label: "Presenze", icon: "✓", roles: ["pope", "admin"] },
  { to: "/dashboard", label: "Dashboard", icon: "📊", roles: ["admin"] },
  { to: "/economia", label: "Economia", icon: "💰", roles: ["admin"] },
  { to: "/circolari", label: "Circolari", icon: "📣", roles: ["admin"] },
  { to: "/admin/fatture", label: "Fatture", icon: "🧾", roles: ["admin"] },
  { to: "/admin/email-templates", label: "Template Email", icon: "✉️", roles: ["admin"] },
  { to: "/admin/backup", label: "Backup", icon: "💾", roles: ["admin"] },
  { to: "/admin/gdpr", label: "GDPR", icon: "🛡", roles: ["admin"] },
  { to: "/utenti", label: "Utenti", icon: "🔐", roles: ["admin"] },
  { to: "/impostazioni", label: "Impostazioni", icon: "⚙️", roles: ["admin"] },
];

function visibleFor(user) {
  const role = user?.role;
  return NAV_ITEMS.filter((item) => {
    if (item.roles.includes("all")) return true;
    if (item.roles.includes("admin") && role === "admin") return true;
    if (item.roles.includes("pope") && (role === "pope" || role === "admin")) return true;
    return false;
  });
}

const navLinkStyle = ({ isActive }) => ({
  padding: "10px 14px",
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
  display: "flex",
  alignItems: "center",
  gap: 6,
});

const mobileNavLinkStyle = ({ isActive }) => ({
  padding: "14px 18px",
  color: isActive ? "#fff" : colors.foam,
  background: isActive ? colors.gradLagoon : "transparent",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 15,
  fontFamily: fonts.body,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  gap: 12,
});

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/login");
  };

  // Chiudi menu al cambio route
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Lock scroll body quando drawer aperto
  useEffect(() => {
    if (menuOpen) document.body.classList.add("no-scroll");
    else document.body.classList.remove("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, [menuOpen]);

  const items = visibleFor(user);

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
          padding: isMobile ? "10px 14px" : "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          boxShadow: colors.shadowSoft,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14, minWidth: 0 }}>
          <img
            src="/logo_zonca.png"
            alt="Zonca"
            style={{
              height: isMobile ? 38 : 46,
              width: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0 2px 6px rgba(8, 145, 178, 0.2))",
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: fonts.display,
                color: colors.foam,
                fontSize: isMobile ? 17 : 20,
                lineHeight: 1,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              Remiera <span style={{ color: colors.lagoon }}>Zonca</span>
            </div>
            {!isMobile && (
              <div style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>
                {user?.email} ·{" "}
                <span style={{ color: colors.lagoon, fontWeight: 600 }}>{user?.role}</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {!isMobile && (
            <>
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
                }}
              >
                Esci
              </button>
            </>
          )}
          {isMobile && (
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
              style={{
                width: 44,
                height: 44,
                border: `1.5px solid ${colors.border}`,
                background: menuOpen ? colors.gradLagoon : "transparent",
                color: menuOpen ? "#fff" : colors.foam,
                borderRadius: 10,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                lineHeight: 1,
                padding: 0,
              }}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          )}
        </div>
      </header>

      {/* Mobile drawer */}
      {isMobile && (
        <>
          {menuOpen && (
            <div
              onClick={() => setMenuOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 31, 46, 0.5)",
                zIndex: 90,
                backdropFilter: "blur(3px)",
              }}
            />
          )}
          <aside
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(86vw, 340px)",
              background: colors.deep,
              zIndex: 95,
              padding: "18px 16px",
              transform: menuOpen ? "translateX(0)" : "translateX(100%)",
              transition: "transform .25s ease",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              boxShadow: "-8px 0 24px rgba(15,31,46,0.15)",
              overflowY: "auto",
            }}
          >
            <div style={{ padding: "4px 8px 14px", borderBottom: `1px solid ${colors.borderSoft}`, marginBottom: 10 }}>
              <div style={{ color: colors.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                Account
              </div>
              <div style={{ color: colors.foam, fontSize: 13, marginTop: 4, wordBreak: "break-all" }}>
                {user?.email}
              </div>
              <div style={{ color: colors.lagoon, fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                {user?.role?.toUpperCase()}
              </div>
            </div>

            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                style={mobileNavLinkStyle}
                onClick={() => setMenuOpen(false)}
              >
                <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}

            <div style={{ marginTop: "auto", paddingTop: 12, borderTop: `1px solid ${colors.borderSoft}`, display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => {
                  setShowChangePassword(true);
                  setMenuOpen(false);
                }}
                style={{
                  padding: "12px 16px",
                  background: "transparent",
                  border: `1.5px solid ${colors.border}`,
                  color: colors.foam,
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: fonts.body,
                  textAlign: "left",
                }}
              >
                🔑 Cambia password
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding: "12px 16px",
                  background: colors.red,
                  border: "none",
                  color: "#fff",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: fonts.body,
                  textAlign: "left",
                }}
              >
                🚪 Esci
              </button>
            </div>
          </aside>
        </>
      )}

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}

      {/* Nav desktop */}
      {!isMobile && (
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
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} style={navLinkStyle}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      {/* Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
