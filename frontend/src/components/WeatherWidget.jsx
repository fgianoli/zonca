import { useEffect, useState } from "react";
import { weatherApi } from "../api/services";
import { colors, fonts } from "../styles/theme";

const WEATHER_CODES = {
  0: { icon: "☀️", label: "Sereno" },
  1: { icon: "🌤", label: "Prev. sereno" },
  2: { icon: "⛅", label: "Parz. nuvoloso" },
  3: { icon: "☁️", label: "Nuvoloso" },
  45: { icon: "🌫", label: "Nebbia" },
  48: { icon: "🌫", label: "Nebbia ghiaccio" },
  51: { icon: "🌦", label: "Pioviggine" },
  53: { icon: "🌦", label: "Pioviggine" },
  55: { icon: "🌦", label: "Pioviggine" },
  61: { icon: "🌧", label: "Pioggia" },
  63: { icon: "🌧", label: "Pioggia" },
  65: { icon: "🌧", label: "Pioggia forte" },
  71: { icon: "🌨", label: "Neve" },
  73: { icon: "🌨", label: "Neve" },
  75: { icon: "🌨", label: "Neve forte" },
  80: { icon: "🌦", label: "Rovesci" },
  81: { icon: "🌦", label: "Rovesci" },
  82: { icon: "⛈", label: "Rovesci forti" },
  95: { icon: "⛈", label: "Temporale" },
  96: { icon: "⛈", label: "Temporale grandine" },
  99: { icon: "⛈", label: "Temporale grandine" },
};

const windDir = (deg) => {
  if (deg == null) return "";
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
};

// Traffic light evaluation from backend status or derived from values
function trafficLight(data) {
  // Prefer explicit status from backend
  const s = data?.status || data?.rowing_status;
  const reasons = data?.reasons || data?.status_reasons || [];

  if (s) {
    const lower = String(s).toLowerCase();
    if (lower.includes("red") || lower.includes("rosso") || lower === "bad") {
      return { light: "🔴", color: colors.red, label: "Condizioni sconsigliate", reasons };
    }
    if (lower.includes("yellow") || lower.includes("giallo") || lower === "warn") {
      return { light: "🟡", color: colors.gold, label: "Attenzione", reasons };
    }
    return { light: "🟢", color: colors.green, label: "Condizioni buone", reasons };
  }

  // Fallback: derive from wind/gusts
  const cur = data?.current || {};
  const gust = cur.wind_gusts ?? cur.gusts ?? 0;
  const wind = cur.wind_speed ?? 0;
  const derived = [];
  if (gust >= 35 || wind >= 25) {
    if (gust >= 35) derived.push(`Raffiche ${Math.round(gust)} km/h`);
    if (wind >= 25) derived.push(`Vento ${Math.round(wind)} km/h`);
    return {
      light: "🔴",
      color: colors.red,
      label: "Condizioni sconsigliate",
      reasons: derived,
    };
  }
  if (gust >= 20 || wind >= 15) {
    if (gust >= 20) derived.push(`Raffiche ${Math.round(gust)} km/h`);
    if (wind >= 15) derived.push(`Vento ${Math.round(wind)} km/h`);
    return { light: "🟡", color: colors.gold, label: "Attenzione", reasons: derived };
  }
  return { light: "🟢", color: colors.green, label: "Condizioni buone", reasons: [] };
}

function SpotCard({ title, subtitle, data, showMarine = false }) {
  if (!data) return null;
  const current = data.current || {};
  const wc = WEATHER_CODES[current.weather_code] || { icon: "🌡", label: "—" };
  const tl = trafficLight(data);

  return (
    <div
      style={{
        background: colors.deep,
        border: `1px solid ${colors.borderSoft}`,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: colors.shadowMed,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Traffic light banner */}
      <div
        style={{
          padding: "12px 16px",
          background: `${tl.color}12`,
          borderBottom: `1px solid ${tl.color}33`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 22 }}>{tl.light}</span>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div
            style={{
              color: tl.color,
              fontWeight: 700,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Condizioni voga
          </div>
          <div style={{ color: colors.foam, fontSize: 14, fontWeight: 600 }}>
            {tl.label}
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{ padding: "16px 18px 0" }}>
        <div
          style={{
            fontFamily: fonts.display,
            color: colors.foam,
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{subtitle}</div>
        )}
      </div>

      {/* Current */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 18px 8px",
        }}
      >
        <div style={{ fontSize: 52, lineHeight: 1 }}>{wc.icon}</div>
        <div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: colors.foam,
              fontFamily: fonts.display,
              lineHeight: 1,
            }}
          >
            {current.temperature != null ? `${Math.round(current.temperature)}°C` : "—"}
          </div>
          <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{wc.label}</div>
        </div>
      </div>

      {/* Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          padding: "4px 18px 18px",
        }}
      >
        <Metric
          icon="💨"
          label="Vento"
          value={
            current.wind_speed != null
              ? `${Math.round(current.wind_speed)} km/h ${windDir(current.wind_direction)}`
              : "—"
          }
        />
        <Metric
          icon="🌬"
          label="Raffiche"
          value={current.wind_gusts != null ? `${Math.round(current.wind_gusts)} km/h` : "—"}
        />
        {showMarine && (
          <>
            <Metric
              icon="🌊"
              label="Onde"
              value={
                current.wave_height != null
                  ? `${Number(current.wave_height).toFixed(1)} m`
                  : "—"
              }
            />
            <Metric
              icon="🌀"
              label="Marea"
              value={
                current.tide != null
                  ? `${Number(current.tide).toFixed(2)} m`
                  : current.sea_level != null
                  ? `${Number(current.sea_level).toFixed(2)} m`
                  : "—"
              }
            />
          </>
        )}
        {!showMarine && current.humidity != null && (
          <Metric icon="💧" label="Umidità" value={`${Math.round(current.humidity)}%`} />
        )}
      </div>

      {/* Reasons */}
      {tl.reasons && tl.reasons.length > 0 && (
        <div
          style={{
            padding: "10px 18px 16px",
            borderTop: `1px solid ${colors.borderSoft}`,
            background: colors.panel,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: colors.muted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            Motivazioni
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              color: colors.foam,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {tl.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div
      style={{
        background: colors.panel,
        borderRadius: 10,
        padding: "8px 10px",
      }}
    >
      <div style={{ color: colors.muted, fontSize: 11, fontWeight: 600 }}>
        {icon} {label}
      </div>
      <div style={{ color: colors.foam, fontSize: 14, fontWeight: 700, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

export default function WeatherWidget() {
  const [padova, setPadova] = useState(null);
  const [laguna, setLaguna] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.allSettled([weatherApi.padova(), weatherApi.laguna()])
      .then(([p, l]) => {
        if (p.status === "fulfilled") setPadova(p.value.data);
        if (l.status === "fulfilled") setLaguna(l.value.data);
        if (p.status === "rejected" && l.status === "rejected") {
          // fallback to legacy single endpoint
          weatherApi
            .current()
            .then((r) => setPadova(r.data))
            .catch(() => setError(true));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section style={{ maxWidth: 980, margin: "0 auto", padding: 20, textAlign: "center", color: colors.muted }}>
        Caricamento condizioni meteo…
      </section>
    );
  }
  if (error || (!padova && !laguna)) return null;

  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "24px 20px" }}>
      <h2
        style={{
          fontFamily: fonts.display,
          color: colors.foam,
          fontSize: 28,
          margin: 0,
          marginBottom: 16,
          textAlign: "center",
          fontWeight: 700,
          letterSpacing: -0.5,
        }}
      >
        Condizioni voga <span style={{ color: colors.lagoon }}>oggi</span>
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        {padova && (
          <SpotCard
            title="🏞 Padova"
            subtitle="Bacinetto di voga"
            data={padova}
            showMarine={false}
          />
        )}
        {laguna && (
          <SpotCard
            title="🌊 Laguna di Venezia"
            subtitle="Condizioni in laguna"
            data={laguna}
            showMarine={true}
          />
        )}
      </div>
    </section>
  );
}
