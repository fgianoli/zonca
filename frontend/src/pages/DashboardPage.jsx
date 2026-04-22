import { useEffect, useState } from "react";
import { dashboardApi } from "../api/services";
import { S, colors, fonts, RUOLI, formatEuro } from "../styles/theme";
import { useIsMobile } from "../hooks/useMediaQuery";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    let mounted = true;
    dashboardApi
      .stats()
      .then((r) => mounted && setStats(r.data))
      .catch(() => mounted && setError("Errore nel caricamento delle statistiche"))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ ...S.container, padding: isMobile ? "16px 12px" : "32px 24px" }}>
        <p style={{ color: colors.muted }}>Caricamento...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={{ ...S.container, padding: isMobile ? "16px 12px" : "32px 24px" }}>
        <p style={{ color: colors.red }}>{error || "Nessun dato disponibile"}</p>
      </div>
    );
  }

  const bigCard = (label, value, color) => (
    <div style={{ ...S.card, flex: 1, minWidth: isMobile ? 140 : 180, padding: isMobile ? 14 : 20 }}>
      <div
        style={{
          color: colors.muted,
          fontSize: isMobile ? 10 : 12,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: isMobile ? 28 : 38,
          color: color || colors.foam,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );

  const section = (title) => (
    <h3
      style={{
        fontFamily: fonts.display,
        color: colors.foam,
        fontSize: 18,
        margin: "32px 0 12px",
      }}
    >
      {title}
    </h3>
  );

  const m = stats.members || {};
  const b = stats.boats || {};
  const bk = stats.bookings || {};
  const f = stats.finance || {};

  return (
    <div style={{ ...S.container, padding: isMobile ? "16px 12px" : "32px 24px" }}>
      <h1 style={{ ...S.title, fontSize: isMobile ? 24 : 30 }}>Dashboard</h1>
      <p style={S.subtitle}>Panoramica generale del gestionale</p>

      {section("Soci")}
      <div style={{ display: "flex", gap: isMobile ? 10 : 16, flexWrap: "wrap" }}>
        {bigCard("Soci attivi", m.total_active ?? 0, colors.gold)}
        {bigCard(
          "Cert. in scadenza (30gg)",
          m.certs_expiring_30d ?? 0,
          (m.certs_expiring_30d ?? 0) > 0 ? colors.gold : colors.foam
        )}
        {bigCard(
          "Cert. scaduti",
          m.certs_expired ?? 0,
          (m.certs_expired ?? 0) > 0 ? colors.red : colors.green
        )}
        {bigCard(
          "Quote non pagate",
          m.fees_unpaid_current_year ?? 0,
          (m.fees_unpaid_current_year ?? 0) > 0 ? colors.red : colors.green
        )}
      </div>

      {section("Soci per ruolo")}
      <div style={{ display: "flex", gap: isMobile ? 8 : 12, flexWrap: "wrap" }}>
        {Object.entries(RUOLI).map(([key, info]) => (
          <div
            key={key}
            style={{
              ...S.card,
              flex: 1,
              minWidth: isMobile ? 120 : 140,
              padding: isMobile ? 14 : 20,
              borderLeft: `4px solid ${info.color}`,
            }}
          >
            <div style={{ color: colors.muted, fontSize: isMobile ? 10 : 12, textTransform: "uppercase" }}>
              {info.icon} {info.label}
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: isMobile ? 24 : 32,
                color: info.color,
                marginTop: 6,
              }}
            >
              {(m.by_ruolo && m.by_ruolo[key]) || 0}
            </div>
          </div>
        ))}
      </div>

      {section("Flotta")}
      <div style={{ display: "flex", gap: isMobile ? 10 : 16, flexWrap: "wrap" }}>
        <div style={{ ...S.card, flex: 1, minWidth: 160 }}>
          <div style={{ color: colors.muted, fontSize: 12, textTransform: "uppercase" }}>
            Totale barche
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 32, color: colors.foam, marginTop: 6 }}>
            {b.total ?? 0}
          </div>
        </div>
        <div style={{ ...S.card, flex: 1, minWidth: 160, borderLeft: `4px solid ${colors.green}` }}>
          <div style={{ color: colors.muted, fontSize: 12, textTransform: "uppercase" }}>
            ● Attive
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 32, color: colors.green, marginTop: 6 }}>
            {b.active ?? 0}
          </div>
        </div>
        <div style={{ ...S.card, flex: 1, minWidth: 160, borderLeft: `4px solid ${colors.gold}` }}>
          <div style={{ color: colors.muted, fontSize: 12, textTransform: "uppercase" }}>
            ● In manutenzione
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 32, color: colors.gold, marginTop: 6 }}>
            {b.in_maintenance ?? 0}
          </div>
        </div>
        <div style={{ ...S.card, flex: 1, minWidth: 160, borderLeft: `4px solid ${colors.red}` }}>
          <div style={{ color: colors.muted, fontSize: 12, textTransform: "uppercase" }}>
            ● Fuori servizio
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 32, color: colors.red, marginTop: 6 }}>
            {b.out_of_service ?? 0}
          </div>
        </div>
      </div>

      {section("Prenotazioni")}
      <div style={{ display: "flex", gap: isMobile ? 10 : 16, flexWrap: "wrap" }}>
        {bigCard("Questo mese", bk.this_month ?? 0, colors.lagoon)}
        {bigCard(
          "In attesa di conferma",
          bk.pending_confirmation ?? 0,
          (bk.pending_confirmation ?? 0) > 0 ? colors.gold : colors.foam
        )}
      </div>

      {section("Bilancio anno corrente")}
      <div style={{ display: "flex", gap: isMobile ? 10 : 16, flexWrap: "wrap" }}>
        <div style={{ ...S.card, flex: 1, minWidth: 200, borderLeft: `4px solid ${colors.green}` }}>
          <div style={{ color: colors.muted, fontSize: 12, textTransform: "uppercase" }}>
            Entrate
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 28, color: colors.green, marginTop: 6 }}>
            {formatEuro(f.year_income)}
          </div>
        </div>
        <div style={{ ...S.card, flex: 1, minWidth: 200, borderLeft: `4px solid ${colors.red}` }}>
          <div style={{ color: colors.muted, fontSize: 12, textTransform: "uppercase" }}>
            Uscite
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 28, color: colors.red, marginTop: 6 }}>
            {formatEuro(f.year_expenses)}
          </div>
        </div>
        <div
          style={{
            ...S.card,
            flex: 1,
            minWidth: 200,
            borderLeft: `4px solid ${(f.year_balance ?? 0) >= 0 ? colors.green : colors.red}`,
          }}
        >
          <div style={{ color: colors.muted, fontSize: 12, textTransform: "uppercase" }}>
            Saldo
          </div>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 28,
              color: (f.year_balance ?? 0) >= 0 ? colors.green : colors.red,
              marginTop: 6,
            }}
          >
            {formatEuro(f.year_balance)}
          </div>
        </div>
      </div>
    </div>
  );
}
