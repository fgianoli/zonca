import { useEffect, useState } from "react";
import { colors, fonts } from "../styles/theme";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("cookie-consent")) {
      const t = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  };

  return (
    <>
      <style>{`
        @keyframes cookieSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div
        role="dialog"
        aria-live="polite"
        style={{
          position: "fixed",
          left: 16,
          right: 16,
          bottom: 16,
          zIndex: 2000,
          background: "#fff",
          border: `1px solid ${colors.borderSoft}`,
          borderRadius: 14,
          padding: "16px 20px",
          boxShadow: colors.shadowLg,
          fontFamily: fonts.body,
          color: colors.foam,
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          maxWidth: 960,
          margin: "0 auto",
          animation: "cookieSlideUp .35s ease-out",
        }}
      >
        <div style={{ flex: 1, minWidth: 260, fontSize: 13, lineHeight: 1.55 }}>
          <strong style={{ color: colors.lagoon }}>🍪 Cookie</strong> — Questo sito usa solo
          cookie tecnici necessari al funzionamento (autenticazione). Non usiamo cookie di
          tracciamento. Leggi la{" "}
          <a
            href="/privacy"
            style={{ color: colors.lagoon, fontWeight: 600, textDecoration: "underline" }}
          >
            Privacy Policy
          </a>
          .
        </div>
        <button
          onClick={accept}
          style={{
            padding: "10px 20px",
            background: colors.gradLagoon,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            boxShadow: colors.shadowLagoon,
            fontFamily: fonts.body,
          }}
        >
          Ho capito
        </button>
      </div>
    </>
  );
}
