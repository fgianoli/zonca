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
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 22, flexShrink: 0 }}>{tl.light}</span>
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
          {tl.reasons && tl.reasons.length > 0 && (
            <div
              style={{
                color: colors.muted,
                fontSize: 11,
                marginTop: 2,
                lineHeight: 1.3,
              }}
            >
              {tl.reasons.join(" · ")}
            </div>
          )}
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
            <TideMetric current={current} />
          </>
        )}
        {!showMarine && current.humidity != null && (
          <Metric icon="💧" label="Umidità" value={`${Math.round(current.humidity)}%`} />
        )}
      </div>

      {/* Forecast giorni successivi */}
      {data.forecast && data.forecast.length > 0 && (
        <div
          style={{
            padding: "14px 18px 12px",
            borderTop: `1px solid ${colors.borderSoft}`,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: colors.muted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            Previsioni {showMarine ? "laguna" : "Padova"}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${data.forecast.length}, 1fr)`,
              gap: 8,
            }}
          >
            {data.forecast.map((day, idx) => (
              <ForecastDay key={day.date} day={day} idx={idx} showMarine={showMarine} />
            ))}
          </div>
        </div>
      )}

      {/* Source / attribution */}
      {data.source && (
        <div
          style={{
            padding: "10px 18px 14px",
            borderTop: `1px solid ${colors.borderSoft}`,
            fontSize: 10,
            color: colors.faint,
            textAlign: "center",
          }}
        >
          Fonte:{" "}
          <a
            href={data.source.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: colors.muted, textDecoration: "none", fontWeight: 600 }}
          >
            {data.source.name}
          </a>
          {data.source.attribution && (
            <span style={{ marginLeft: 6 }}>· {data.source.attribution}</span>
          )}
        </div>
      )}
    </div>
  );
}

function ForecastDay({ day, idx, showMarine }) {
  const wc = WEATHER_CODES[day.weather_code] || { icon: "🌡" };
  const tl = day.traffic_light || { status: "green", reasons: [] };
  const lightIcon = tl.status === "red" ? "🔴" : tl.status === "yellow" ? "🟡" : "🟢";
  const tlColor =
    tl.status === "red" ? colors.red : tl.status === "yellow" ? colors.gold : colors.green;

  const label = (() => {
    if (idx === 0) return "Oggi";
    const d = new Date(day.date);
    return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" });
  })();

  const reasonText = (tl.reasons || []).join(", ");

  return (
    <div
      title={reasonText || "Condizioni buone"}
      style={{
        background: colors.panel,
        border: `1px solid ${tlColor}33`,
        borderRadius: 10,
        padding: "10px 8px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        cursor: reasonText ? "help" : "default",
      }}
    >
      <div
        style={{
          color: colors.muted,
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, lineHeight: 1 }}>{wc.icon}</div>
      <div
        style={{
          color: colors.foam,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: fonts.body,
        }}
      >
        {Math.round(day.temp_min)}° / {Math.round(day.temp_max)}°
      </div>
      <div
        style={{
          fontSize: 10,
          color: colors.muted,
          display: "flex",
          alignItems: "center",
          gap: 4,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <span>💨 {Math.round(day.gusts_max)}</span>
        {showMarine && day.wave_height_max != null && (
          <>
            <span style={{ color: colors.faint }}>·</span>
            <span>🌊 {Number(day.wave_height_max).toFixed(1)}</span>
          </>
        )}
        {!showMarine && day.rain_probability != null && (
          <>
            <span style={{ color: colors.faint }}>·</span>
            <span>💧 {Math.round(day.rain_probability)}%</span>
          </>
        )}
      </div>
      <div
        style={{
          marginTop: 2,
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        {lightIcon}
      </div>
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

function TideMetric({ current }) {
  const level = current?.tide_level_m;
  const trend = current?.tide_trend; // rising | falling | stable | null
  const nextHigh = current?.tide_next_high;
  const nextLow = current?.tide_next_low;

  if (level == null && !current?.tide_available) {
    return (
      <div style={{ background: colors.panel, borderRadius: 10, padding: "8px 10px" }}>
        <div style={{ color: colors.muted, fontSize: 11, fontWeight: 600 }}>🌀 Marea</div>
        <div style={{ color: colors.faint, fontSize: 12, marginTop: 2 }}>n.d.</div>
      </div>
    );
  }

  const trendIcon = trend === "rising" ? "↑" : trend === "falling" ? "↓" : "→";
  const trendLabel =
    trend === "rising" ? "crescente" : trend === "falling" ? "calante" : "stabile";
  const trendColor =
    trend === "rising" ? colors.green : trend === "falling" ? colors.orange : colors.muted;

  const formatTime = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const today = new Date();
      const sameDay = d.toDateString() === today.toDateString();
      const hm = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
      return sameDay
        ? hm
        : `${d.toLocaleDateString("it-IT", { weekday: "short" })} ${hm}`;
    } catch {
      return iso;
    }
  };

  const cm = (m) => `${Math.round(Number(m) * 100)} cm`;

  return (
    <div
      style={{
        background: colors.panel,
        borderRadius: 10,
        padding: "8px 10px",
        gridColumn: "1 / -1", // occupa tutta la riga
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 2,
        }}
      >
        <div style={{ color: colors.muted, fontSize: 11, fontWeight: 600 }}>🌀 Marea</div>
        <div
          style={{
            color: trendColor,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {trendIcon} {trendLabel}
        </div>
      </div>
      <div
        style={{
          color: colors.foam,
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        {level != null ? cm(level) : "—"}
      </div>
      {(nextHigh || nextLow) && (
        <div
          style={{
            marginTop: 4,
            paddingTop: 4,
            borderTop: `1px solid ${colors.border}`,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            fontSize: 10,
            color: colors.muted,
          }}
        >
          {nextHigh && (
            <span>
              🔺 Alta {formatTime(nextHigh.time)}{" "}
              <strong style={{ color: colors.foam }}>{cm(nextHigh.level_m)}</strong>
            </span>
          )}
          {nextLow && (
            <span>
              🔻 Bassa {formatTime(nextLow.time)}{" "}
              <strong style={{ color: colors.foam }}>{cm(nextLow.level_m)}</strong>
            </span>
          )}
        </div>
      )}
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
            subtitle="Bacchiglione – Piovego"
            data={padova}
            showMarine={false}
          />
        )}
        {laguna && (
          <SpotCard
            title="🌊 Laguna di Venezia"
            subtitle="Bacino nord · vento, onde, marea"
            data={laguna}
            showMarine={true}
          />
        )}
      </div>
    </section>
  );
}
