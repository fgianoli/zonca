import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { bookingsApi, exportsApi, downloadBlob } from "../api/services";
import { colors, fonts, S, TIPI_BARCA, formatDate } from "../styles/theme";
import { useIsMobile } from "../hooks/useMediaQuery";

const FILTERS = [
  { id: "tutte", label: "Tutte" },
  { id: "attesa", label: "In attesa" },
  { id: "confermate", label: "Confermate" },
  { id: "mie", label: "Mie" },
];

const formatDayLong = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00");
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

export default function PrenotazioniPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isPope = user?.role === "pope" || isAdmin;
  const isMobile = useIsMobile();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("tutte");
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await bookingsApi.list();
      setBookings(data);
      setError("");
    } catch (e) {
      setError(e.response?.data?.detail || "Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    return {
      tutte: bookings.length,
      attesa: bookings.filter((b) => !b.confirmed).length,
      confermate: bookings.filter((b) => b.confirmed).length,
      mie: bookings.filter(
        (b) =>
          b.created_by === user?.id ||
          b.pope_id === user?.member_id ||
          (b.partecipanti || []).some((p) => p.member_id === user?.member_id || p.id === user?.member_id)
      ).length,
    };
  }, [bookings, user]);

  const filtered = useMemo(() => {
    let list = [...bookings];
    if (filter === "attesa") list = list.filter((b) => !b.confirmed);
    else if (filter === "confermate") list = list.filter((b) => b.confirmed);
    else if (filter === "mie") {
      list = list.filter(
        (b) =>
          b.created_by === user?.id ||
          b.pope_id === user?.member_id ||
          (b.partecipanti || []).some((p) => p.member_id === user?.member_id || p.id === user?.member_id)
      );
    }
    list.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.slot || "").localeCompare(a.slot || "");
    });
    return list;
  }, [bookings, filter, user]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach((b) => {
      (g[b.date] = g[b.date] || []).push(b);
    });
    Object.values(g).forEach((arr) => arr.sort((a, b) => (a.slot || "").localeCompare(b.slot || "")));
    return g;
  }, [filtered]);

  const confirm = async (b) => {
    setMsg("");
    try {
      await bookingsApi.confirm(b.id);
      setMsg("Prenotazione confermata ✓");
      load();
    } catch (e) {
      setMsg(e.response?.data?.detail || "Errore");
    }
  };

  const remove = async (b) => {
    if (!window.confirm("Eliminare questa prenotazione?")) return;
    setMsg("");
    try {
      await bookingsApi.remove(b.id);
      setMsg("Prenotazione eliminata");
      load();
    } catch (e) {
      setMsg(e.response?.data?.detail || "Errore");
    }
  };

  const canConfirm = (b) => !b.confirmed && isPope;
  const canDelete = (b) => {
    if (isAdmin || isPope) return true;
    if (b.created_by === user?.id) return true;
    return false;
  };

  return (
    <div style={{ ...S.container, padding: isMobile ? "16px 12px" : "32px 24px" }}>
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "flex-end",
          gap: 12,
          flexDirection: isMobile ? "column" : "row",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ ...S.title, fontSize: isMobile ? 24 : 30 }}>Prenotazioni</h1>
          <div style={S.subtitle}>
            {bookings.length} totali • {counts.attesa} in attesa di conferma
          </div>
        </div>
        {isAdmin && (
          <button
            style={{ ...S.btn, ...S.btnGhost, width: isMobile ? "100%" : "auto" }}
            onClick={async () => {
              try {
                const res = await exportsApi.bookings("", "");
                downloadBlob(res, "prenotazioni.csv");
              } catch (e) {
                setMsg("");
                setError(e.response?.data?.detail || "Errore export");
              }
            }}
          >
            📥 Esporta CSV
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div
        style={
          isMobile
            ? {
                display: "flex",
                gap: 6,
                marginBottom: 16,
                overflowX: "auto",
                whiteSpace: "nowrap",
                paddingBottom: 4,
                WebkitOverflowScrolling: "touch",
              }
            : { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }
        }
      >
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                ...S.btnSmall,
                backgroundColor: active ? colors.lagoon : "transparent",
                border: `1px solid ${active ? colors.lagoon : colors.muted}44`,
                color: active ? "#fff" : colors.muted,
                padding: "6px 14px",
                flexShrink: 0,
              }}
            >
              {f.label} <span style={{ opacity: 0.7 }}>({counts[f.id] || 0})</span>
            </button>
          );
        })}
      </div>

      {msg && (
        <div style={{ ...S.card, borderColor: colors.green, color: colors.green, marginBottom: 12 }}>{msg}</div>
      )}
      {error && (
        <div style={{ ...S.card, borderColor: colors.red, color: colors.red, marginBottom: 12 }}>{error}</div>
      )}

      {loading ? (
        <div style={{ color: colors.muted }}>Caricamento…</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
          <div style={{ color: colors.muted }}>Nessuna prenotazione da mostrare.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {Object.keys(grouped)
            .sort((a, b) => b.localeCompare(a))
            .map((date) => (
              <div key={date}>
                <div
                  style={{
                    color: colors.gold,
                    fontFamily: fonts.display,
                    fontSize: 16,
                    marginBottom: 8,
                    textTransform: "capitalize",
                    borderBottom: `1px solid ${colors.lagoon}44`,
                    paddingBottom: 4,
                  }}
                >
                  {formatDayLong(date)}
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {grouped[date].map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      isMobile={isMobile}
                      canConfirm={canConfirm(b)}
                      canDelete={canDelete(b)}
                      onConfirm={() => confirm(b)}
                      onDelete={() => remove(b)}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking: b, isMobile, canConfirm, canDelete, onConfirm, onDelete }) {
  const boat = b.boat || {};
  const tipo = TIPI_BARCA[boat.tipo] || TIPI_BARCA.altro;
  const boatColor = boat.color || colors.lagoon;
  const pope = b.pope || null;
  const partecipanti = b.partecipanti || [];

  return (
    <div
      style={{
        ...S.card,
        padding: 0,
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: "stretch",
        overflow: "hidden",
        borderLeft: `4px solid ${boatColor}`,
      }}
    >
      <div style={{ flex: 1, padding: isMobile ? 12 : 14, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 22 }}>{tipo.icon}</span>
          <div>
            <div style={{ color: colors.foam, fontWeight: 700, fontSize: 15 }}>
              {boat.name || "Barca rimossa"} • {b.slot}
            </div>
            <div style={{ color: colors.muted, fontSize: 11 }}>
              {tipo.label}
              {boat.seats && ` • ${boat.seats} posti`}
            </div>
          </div>
        </div>

        {pope && (
          <div style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>
            ⚓ Pope: <span style={{ color: colors.gold, fontWeight: 700 }}>{pope.name}</span>
          </div>
        )}

        {partecipanti.length > 0 && (
          <div style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
            👥 Partecipanti:{" "}
            <span style={{ color: colors.foam }}>
              {partecipanti.map((p) => p.name || p.member_name || "—").join(", ")}
            </span>
          </div>
        )}

        {b.note && (
          <div style={{ color: colors.muted, fontSize: 11, marginTop: 6, fontStyle: "italic" }}>{b.note}</div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "row" : "column",
          alignItems: isMobile ? "center" : "flex-end",
          gap: 8,
          padding: isMobile ? "0 12px 12px" : 14,
          minWidth: isMobile ? 0 : 130,
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            ...S.badge,
            backgroundColor: b.confirmed ? `${colors.green}22` : `${colors.gold}22`,
            color: b.confirmed ? colors.green : colors.gold,
            border: `1px solid ${(b.confirmed ? colors.green : colors.gold)}55`,
          }}
        >
          {b.confirmed ? "✓ Confermata" : "⏳ In attesa"}
        </span>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {canConfirm && (
            <button onClick={onConfirm} style={{ ...S.btnSmall, ...S.btnGreen }}>
              ✓ Conferma
            </button>
          )}
          {canDelete && (
            <button onClick={onDelete} style={{ ...S.btnSmall, ...S.btnRed }}>
              ✕ Elimina
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
