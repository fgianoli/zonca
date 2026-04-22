import { useEffect, useState } from "react";
import { weatherApi } from "../api/services";
import { colors, fonts } from "../styles/theme";

// Open-Meteo weather code → emoji + label (sintesi)
const WEATHER_CODES = {
  0: { icon: "☀️", label: "Sereno" },
  1: { icon: "🌤", label: "Prevalent. sereno" },
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
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
};

const formatDay = (dateStr) => {
  const d = new Date(dateStr);
  const today = new Date().toISOString().split("T")[0];
  if (dateStr === today) return "Oggi";
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" });
};

export default function WeatherWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    weatherApi
      .current()
      .then((res) => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section
        style={{
          maxWidth: 600,
          margin: "0 auto",
          padding: "20px",
          color: colors.muted,
          textAlign: "center",
        }}
      >
        Caricamento meteo...
      </section>
    );
  }

  if (error || !data) return null;

  const current = data.current || {};
  const wc = WEATHER_CODES[current.weather_code] || { icon: "🌡", label: "-" };

  return (
    <section
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: "24px 20px",
      }}
    >
      <h2
        style={{
          fontFamily: fonts.display,
          color: colors.gold,
          fontSize: 24,
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        Meteo Padova
      </h2>

      {data.wind_alert && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: colors.red + "22",
            border: `1px solid ${colors.red}`,
            borderRadius: 8,
            color: colors.red,
            fontSize: 14,
            marginBottom: 16,
            textAlign: "center",
            fontWeight: 700,
          }}
        >
          ⚠️ Vento forte — raffiche fino a {Math.round(current.wind_gusts)} km/h
        </div>
      )}

      {/* Current */}
      <div
        style={{
          backgroundColor: colors.deep,
          border: `1px solid ${colors.borderSoft}`,
          borderRadius: 14,
          padding: "24px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          marginBottom: 12,
          boxShadow: colors.shadowSoft,
        }}
      >
        <div style={{ fontSize: 64, lineHeight: 1 }}>{wc.icon}</div>
        <div style={{ textAlign: "left" }}>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: colors.foam,
              fontFamily: fonts.display,
              lineHeight: 1,
            }}
          >
            {Math.round(current.temperature)}°C
          </div>
          <div style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>
            {wc.label}
          </div>
          <div
            style={{
              color: colors.muted,
              fontSize: 12,
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              💨 {Math.round(current.wind_speed)} km/h {windDir(current.wind_direction)}
            </span>
            <span style={{ color: colors.faint }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              💧 {Math.round(current.humidity)}%
            </span>
          </div>
        </div>
      </div>

      {/* Forecast */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}
      >
        {(data.forecast || []).map((day) => {
          const dwc = WEATHER_CODES[day.weather_code] || { icon: "🌡" };
          return (
            <div
              key={day.date}
              style={{
                backgroundColor: colors.deep,
                border: `1px solid ${colors.borderSoft}`,
                borderRadius: 12,
                padding: "16px 12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                textAlign: "center",
                boxShadow: colors.shadowSoft,
              }}
            >
              <div
                style={{
                  color: colors.muted,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontWeight: 600,
                }}
              >
                {formatDay(day.date)}
              </div>
              <div style={{ fontSize: 34, lineHeight: 1 }}>{dwc.icon}</div>
              <div
                style={{
                  color: colors.foam,
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: fonts.body,
                }}
              >
                {Math.round(day.temp_min)}° / {Math.round(day.temp_max)}°
              </div>
              <div
                style={{
                  color: colors.muted,
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  width: "100%",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                  💨 {Math.round(day.wind_max)}
                </span>
                <span style={{ color: colors.faint }}>·</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                  💧 {Math.round(day.rain_probability || 0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
