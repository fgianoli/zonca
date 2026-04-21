import { useEffect, useMemo, useState } from "react";
import { eventsApi } from "../api/services";
import { S, colors, fonts, formatDate } from "../styles/theme";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";

const EVENT_TYPES = {
  regata: { label: "Regata", icon: "🏁", color: colors.lagoon },
  festa: { label: "Festa", icon: "🎉", color: colors.gold },
  corso: { label: "Corso", icon: "📘", color: colors.green },
  altro: { label: "Altro", icon: "📌", color: colors.muted },
};

const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

const emptyForm = {
  title: "",
  event_type: "regata",
  date_start: "",
  date_end: "",
  location: "",
  max_participants: "",
  requires_registration: true,
  is_public: false,
  description: "",
};

function formatDateTime(s) {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventiPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState("upcoming"); // upcoming | past | all
  const [typeFilter, setTypeFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [detailEvent, setDetailEvent] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (timeFilter === "upcoming") params.upcoming = true;
      if (typeFilter) params.event_type = typeFilter;
      const r = await eventsApi.list(params);
      let data = r.data || [];
      if (timeFilter === "past") {
        const now = new Date();
        data = data.filter((e) => new Date(e.date_start) < now);
      }
      data.sort((a, b) => {
        const aa = new Date(a.date_start).getTime();
        const bb = new Date(b.date_start).getTime();
        return timeFilter === "past" ? bb - aa : aa - bb;
      });
      setEvents(data);
      setError(null);
    } catch (e) {
      setError("Errore nel caricamento eventi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [timeFilter, typeFilter]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (ev) => {
    setEditing(ev);
    setForm({
      title: ev.title || "",
      event_type: ev.event_type || "regata",
      date_start: ev.date_start ? ev.date_start.slice(0, 16) : "",
      date_end: ev.date_end ? ev.date_end.slice(0, 16) : "",
      location: ev.location || "",
      max_participants: ev.max_participants ?? "",
      requires_registration: ev.requires_registration ?? true,
      is_public: ev.is_public ?? false,
      description: ev.description || "",
    });
    setFormOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date_start) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        event_type: form.event_type,
        date_start: form.date_start,
        date_end: form.date_end || null,
        location: form.location || null,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        requires_registration: !!form.requires_registration,
        is_public: !!form.is_public,
        description: form.description || null,
      };
      if (editing) await eventsApi.update(editing.id, payload);
      else await eventsApi.create(payload);
      setFormOpen(false);
      await load();
    } catch {
      alert("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id) => {
    try {
      await eventsApi.remove(id);
      setConfirmDel(null);
      await load();
    } catch {
      alert("Errore nell'eliminazione");
    }
  };

  const register = async (ev) => {
    try {
      await eventsApi.register(ev.id, {});
      await load();
      if (detailEvent?.id === ev.id) {
        const r = await eventsApi.get(ev.id);
        setDetailEvent(r.data);
      }
    } catch (e) {
      alert(e?.response?.data?.detail || "Errore nell'iscrizione");
    }
  };

  const unregister = async (ev) => {
    if (!user?.member_id) return;
    try {
      await eventsApi.unregister(ev.id, user.member_id);
      await load();
      if (detailEvent?.id === ev.id) {
        const r = await eventsApi.get(ev.id);
        setDetailEvent(r.data);
      }
    } catch {
      alert("Errore nell'annullamento");
    }
  };

  const confirmWaitlist = async (ev, reg) => {
    try {
      await eventsApi.confirmRegistration(ev.id, reg.id);
      const r = await eventsApi.get(ev.id);
      setDetailEvent(r.data);
      await load();
    } catch {
      alert("Errore nella conferma");
    }
  };

  const removeReg = async (ev, reg) => {
    try {
      await eventsApi.unregister(ev.id, reg.member_id);
      const r = await eventsApi.get(ev.id);
      setDetailEvent(r.data);
      await load();
    } catch {
      alert("Errore nella rimozione");
    }
  };

  const set = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  // Derive own registration for an event
  const myReg = (ev) => {
    if (!user?.member_id) return null;
    return (ev.registrations || []).find(
      (r) => r.member_id === user.member_id && r.status !== "cancelled"
    );
  };

  const waitlistPosition = (ev, reg) => {
    const wl = (ev.registrations || []).filter((r) => r.status === "waitlist");
    wl.sort((a, b) => a.id - b.id);
    return wl.findIndex((r) => r.id === reg.id) + 1;
  };

  return (
    <div style={S.container}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={S.title}>Eventi e Regate</h1>
          <p style={S.subtitle}>Calendario delle manifestazioni della remiera</p>
        </div>
        {isAdmin && (
          <button onClick={openNew} style={S.btn}>
            + Nuovo evento
          </button>
        )}
      </div>

      {/* Time tabs */}
      <div style={{ display: "flex", gap: 6, marginTop: 20, flexWrap: "wrap" }}>
        {[
          { k: "upcoming", l: "Prossimi" },
          { k: "past", l: "Passati" },
          { k: "all", l: "Tutti" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTimeFilter(t.k)}
            style={{
              ...S.btnSmall,
              padding: "8px 16px",
              background: timeFilter === t.k ? colors.gradLagoon : colors.deep,
              color: timeFilter === t.k ? "#fff" : colors.foam,
              border: `1px solid ${timeFilter === t.k ? "transparent" : colors.border}`,
              boxShadow: timeFilter === t.k ? colors.shadowLagoon : "none",
            }}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* Type pills */}
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => setTypeFilter("")}
          style={{
            ...S.btnSmall,
            background: !typeFilter ? colors.foam : colors.deep,
            color: !typeFilter ? "#fff" : colors.muted,
            border: `1px solid ${colors.border}`,
          }}
        >
          Tutti
        </button>
        {Object.entries(EVENT_TYPES).map(([k, t]) => (
          <button
            key={k}
            onClick={() => setTypeFilter(k)}
            style={{
              ...S.btnSmall,
              background: typeFilter === k ? `${t.color}22` : colors.deep,
              color: typeFilter === k ? t.color : colors.muted,
              border: `1px solid ${typeFilter === k ? t.color + "55" : colors.border}`,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div
          style={{
            background: `${colors.red}22`,
            color: colors.red,
            border: `1px solid ${colors.red}55`,
            borderRadius: 8,
            padding: "10px 14px",
            marginTop: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* List */}
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: colors.muted }}>Caricamento...</div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: colors.muted }}>
            Nessun evento trovato.
          </div>
        ) : (
          events.map((ev) => {
            const type = EVENT_TYPES[ev.event_type] || EVENT_TYPES.altro;
            const d = new Date(ev.date_start);
            const mine = myReg(ev);
            const spots = ev.available_spots;
            let avail = { color: colors.green, label: "Posti disponibili" };
            if (ev.max_participants) {
              if (spots === 0) avail = { color: colors.red, label: "Completo / Lista d'attesa" };
              else if (spots != null && spots <= 3)
                avail = { color: colors.orange, label: `Ultimi ${spots} posti` };
            }
            const pct = ev.max_participants
              ? Math.min(100, Math.round(((ev.participants_count || 0) * 100) / ev.max_participants))
              : 0;

            return (
              <div
                key={ev.id}
                style={{
                  ...S.card,
                  padding: 18,
                  display: "flex",
                  gap: 18,
                  alignItems: "stretch",
                  borderLeft: `4px solid ${type.color}`,
                  cursor: "pointer",
                }}
                onClick={() => setDetailEvent(ev)}
              >
                {/* Date badge */}
                <div
                  style={{
                    flex: "0 0 72px",
                    textAlign: "center",
                    background: `${type.color}11`,
                    border: `1px solid ${type.color}33`,
                    borderRadius: 12,
                    padding: "10px 6px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: fonts.display,
                      fontSize: 30,
                      fontWeight: 700,
                      color: type.color,
                      lineHeight: 1,
                    }}
                  >
                    {d.getDate()}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      color: colors.muted,
                      marginTop: 4,
                      fontWeight: 600,
                    }}
                  >
                    {MESI[d.getMonth()]} {d.getFullYear()}
                  </div>
                </div>

                {/* Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div
                      style={{
                        fontFamily: fonts.display,
                        fontSize: 20,
                        fontWeight: 700,
                        color: colors.foam,
                      }}
                    >
                      {ev.title}
                    </div>
                    <span
                      style={{
                        ...S.badge,
                        background: `${type.color}22`,
                        color: type.color,
                        border: `1px solid ${type.color}55`,
                      }}
                    >
                      {type.icon} {type.label}
                    </span>
                    {ev.is_public && (
                      <span
                        style={{
                          ...S.badge,
                          background: `${colors.gold}22`,
                          color: colors.gold,
                        }}
                      >
                        🌐 Pubblico
                      </span>
                    )}
                  </div>
                  <div style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>
                    🕐 {formatDateTime(ev.date_start)}
                    {ev.date_end ? ` → ${formatDateTime(ev.date_end)}` : ""}
                    {ev.location && <> &nbsp;·&nbsp; 📍 {ev.location}</>}
                  </div>
                  {ev.description && (
                    <div
                      style={{
                        color: colors.muted,
                        fontSize: 13,
                        marginTop: 8,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {ev.description}
                    </div>
                  )}

                  {/* Participants */}
                  {ev.requires_registration && (
                    <div style={{ marginTop: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: 12,
                          color: colors.muted,
                        }}
                      >
                        <span>
                          <span
                            style={{
                              display: "inline-block",
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: avail.color,
                              marginRight: 6,
                            }}
                          />
                          {ev.participants_count || 0}
                          {ev.max_participants ? `/${ev.max_participants}` : ""} iscritti
                        </span>
                        <span style={{ color: avail.color, fontWeight: 600 }}>{avail.label}</span>
                      </div>
                      {ev.max_participants ? (
                        <div
                          style={{
                            height: 6,
                            background: colors.borderSoft,
                            borderRadius: 4,
                            marginTop: 6,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background: avail.color,
                              transition: "width .2s",
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Actions */}
                  <div
                    style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {ev.requires_registration && user?.member_id && !mine && (
                      <button
                        onClick={() => register(ev)}
                        style={{ ...S.btnSmall, ...S.btnGreen }}
                      >
                        Iscriviti
                      </button>
                    )}
                    {mine && mine.status === "confirmed" && (
                      <>
                        <span
                          style={{
                            ...S.badge,
                            background: `${colors.green}22`,
                            color: colors.green,
                            border: `1px solid ${colors.green}55`,
                            padding: "7px 12px",
                          }}
                        >
                          ✓ Iscritto
                        </span>
                        <button
                          onClick={() => unregister(ev)}
                          style={{ ...S.btnSmall, ...S.btnRed }}
                        >
                          Annulla iscrizione
                        </button>
                      </>
                    )}
                    {mine && mine.status === "waitlist" && (
                      <>
                        <span
                          style={{
                            ...S.badge,
                            background: `${colors.orange}22`,
                            color: colors.orange,
                            border: `1px solid ${colors.orange}55`,
                            padding: "7px 12px",
                          }}
                        >
                          ⏳ Lista d'attesa #{waitlistPosition(ev, mine)}
                        </span>
                        <button
                          onClick={() => unregister(ev)}
                          style={{ ...S.btnSmall, ...S.btnRed }}
                        >
                          Esci dalla lista
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setDetailEvent(ev)}
                      style={{
                        ...S.btnSmall,
                        background: colors.deep,
                        color: colors.foam,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      Dettagli
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => openEdit(ev)}
                          style={{
                            ...S.btnSmall,
                            background: `${colors.lagoon}22`,
                            color: colors.lagoon,
                          }}
                        >
                          ✏️ Modifica
                        </button>
                        <button
                          onClick={() => setConfirmDel(ev)}
                          style={{ ...S.btnSmall, ...S.btnRed }}
                        >
                          🗑 Elimina
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form modal */}
      {formOpen && (
        <Modal
          title={editing ? "Modifica evento" : "Nuovo evento"}
          onClose={() => setFormOpen(false)}
          maxWidth={560}
        >
          <form onSubmit={submit}>
            <label style={S.label}>Titolo *</label>
            <input style={S.input} value={form.title} onChange={set("title")} required />

            <label style={{ ...S.label, marginTop: 14 }}>Tipo evento</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(EVENT_TYPES).map(([k, t]) => (
                <label
                  key={k}
                  style={{
                    flex: 1,
                    minWidth: 100,
                    cursor: "pointer",
                    padding: "10px",
                    border: `1.5px solid ${
                      form.event_type === k ? t.color : colors.border
                    }`,
                    background: form.event_type === k ? `${t.color}15` : colors.deep,
                    borderRadius: 10,
                    textAlign: "center",
                    transition: "all .15s",
                  }}
                >
                  <input
                    type="radio"
                    name="event_type"
                    value={k}
                    checked={form.event_type === k}
                    onChange={set("event_type")}
                    style={{ display: "none" }}
                  />
                  <div style={{ fontSize: 20 }}>{t.icon}</div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: form.event_type === k ? t.color : colors.foam,
                      marginTop: 4,
                    }}
                  >
                    {t.label}
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Inizio *</label>
                <input
                  type="datetime-local"
                  style={S.input}
                  value={form.date_start}
                  onChange={set("date_start")}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Fine (opz.)</label>
                <input
                  type="datetime-local"
                  style={S.input}
                  value={form.date_end}
                  onChange={set("date_end")}
                />
              </div>
            </div>

            <label style={{ ...S.label, marginTop: 14 }}>Luogo</label>
            <input
              style={S.input}
              value={form.location}
              onChange={set("location")}
              placeholder="es. Canale della Giudecca"
            />

            <label style={{ ...S.label, marginTop: 14 }}>Max partecipanti (opz.)</label>
            <input
              type="number"
              min="1"
              style={S.input}
              value={form.max_participants}
              onChange={set("max_participants")}
            />

            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ color: colors.foam, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.requires_registration}
                  onChange={set("requires_registration")}
                />{" "}
                Richiede iscrizione
              </label>
              <label style={{ color: colors.foam, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.is_public} onChange={set("is_public")} /> Pubblico
                <span style={{ color: colors.muted, marginLeft: 6, fontSize: 12 }}>
                  (mostrato anche sulla homepage)
                </span>
              </label>
            </div>

            <label style={{ ...S.label, marginTop: 14 }}>Descrizione</label>
            <textarea
              style={{ ...S.input, minHeight: 80, resize: "vertical" }}
              value={form.description}
              onChange={set("description")}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                style={{ ...S.btn, ...S.btnGhost, flex: 1 }}
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={saving || !form.title.trim() || !form.date_start}
                style={{
                  ...S.btn,
                  flex: 2,
                  opacity: saving || !form.title.trim() || !form.date_start ? 0.5 : 1,
                }}
              >
                {saving ? "Salvataggio..." : editing ? "✓ Salva modifiche" : "✓ Crea evento"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail modal */}
      {detailEvent &&
        (() => {
          const ev = detailEvent;
          const type = EVENT_TYPES[ev.event_type] || EVENT_TYPES.altro;
          const regs = ev.registrations || [];
          const confirmed = regs.filter((r) => r.status === "confirmed");
          const waitlist = regs.filter((r) => r.status === "waitlist");
          const mine = myReg(ev);
          return (
            <Modal title={ev.title} onClose={() => setDetailEvent(null)} maxWidth={640}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <span
                  style={{
                    ...S.badge,
                    background: `${type.color}22`,
                    color: type.color,
                    border: `1px solid ${type.color}55`,
                  }}
                >
                  {type.icon} {type.label}
                </span>
                {ev.is_public && (
                  <span style={{ ...S.badge, background: `${colors.gold}22`, color: colors.gold }}>
                    🌐 Pubblico
                  </span>
                )}
              </div>
              <div style={{ color: colors.foam, fontSize: 14, lineHeight: 1.6 }}>
                <div>
                  <strong>🕐 Inizio:</strong> {formatDateTime(ev.date_start)}
                </div>
                {ev.date_end && (
                  <div>
                    <strong>🏁 Fine:</strong> {formatDateTime(ev.date_end)}
                  </div>
                )}
                {ev.location && (
                  <div>
                    <strong>📍 Luogo:</strong> {ev.location}
                  </div>
                )}
                {ev.max_participants && (
                  <div>
                    <strong>👥 Capienza:</strong> {ev.participants_count || 0}/{ev.max_participants}
                  </div>
                )}
                {ev.description && (
                  <div style={{ marginTop: 10, color: colors.muted, whiteSpace: "pre-wrap" }}>
                    {ev.description}
                  </div>
                )}
              </div>

              {/* Socio view */}
              {!isAdmin && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    background: colors.panel,
                    borderRadius: 10,
                  }}
                >
                  <div style={{ color: colors.muted, fontSize: 12 }}>Totale iscritti</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: colors.foam }}>
                    {ev.participants_count || 0}
                    {ev.max_participants ? ` / ${ev.max_participants}` : ""}
                  </div>
                  {mine && (
                    <div style={{ marginTop: 8, fontSize: 13, color: colors.foam }}>
                      Il tuo stato:{" "}
                      <strong
                        style={{
                          color: mine.status === "confirmed" ? colors.green : colors.orange,
                        }}
                      >
                        {mine.status === "confirmed"
                          ? "Confermato"
                          : `In lista d'attesa (#${waitlistPosition(ev, mine)})`}
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {/* Admin: full list */}
              {isAdmin && (
                <>
                  <h3
                    style={{
                      fontFamily: fonts.display,
                      color: colors.gold,
                      fontSize: 16,
                      marginTop: 20,
                      marginBottom: 10,
                    }}
                  >
                    Confermati ({confirmed.length})
                  </h3>
                  {confirmed.length === 0 ? (
                    <div style={{ color: colors.muted, fontSize: 13 }}>Nessuno iscritto.</div>
                  ) : (
                    confirmed.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          borderBottom: `1px solid ${colors.borderSoft}`,
                          fontSize: 13,
                        }}
                      >
                        <div>
                          <span style={{ color: colors.foam, fontWeight: 600 }}>
                            {r.member ? `${r.member.nome} ${r.member.cognome}` : `#${r.member_id}`}
                          </span>
                          {r.note && (
                            <span style={{ color: colors.muted, marginLeft: 8, fontStyle: "italic" }}>
                              — {r.note}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeReg(ev, r)}
                          style={{ ...S.btnSmall, ...S.btnRed }}
                        >
                          Rimuovi
                        </button>
                      </div>
                    ))
                  )}

                  {waitlist.length > 0 && (
                    <>
                      <h3
                        style={{
                          fontFamily: fonts.display,
                          color: colors.orange,
                          fontSize: 16,
                          marginTop: 20,
                          marginBottom: 10,
                        }}
                      >
                        Lista d'attesa ({waitlist.length})
                      </h3>
                      {waitlist.map((r, i) => (
                        <div
                          key={r.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 12px",
                            borderBottom: `1px solid ${colors.borderSoft}`,
                            fontSize: 13,
                          }}
                        >
                          <div>
                            <span style={{ color: colors.orange, fontWeight: 600, marginRight: 6 }}>
                              #{i + 1}
                            </span>
                            <span style={{ color: colors.foam }}>
                              {r.member ? `${r.member.nome} ${r.member.cognome}` : `#${r.member_id}`}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => confirmWaitlist(ev, r)}
                              style={{ ...S.btnSmall, ...S.btnGreen }}
                            >
                              Conferma
                            </button>
                            <button
                              onClick={() => removeReg(ev, r)}
                              style={{ ...S.btnSmall, ...S.btnRed }}
                            >
                              Rimuovi
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </Modal>
          );
        })()}

      {/* Confirm delete */}
      {confirmDel && (
        <Modal title="Conferma eliminazione" onClose={() => setConfirmDel(null)} maxWidth={380}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗑️</div>
            <div style={{ color: colors.foam, fontWeight: 700, marginBottom: 8 }}>
              Eliminare "{confirmDel.title}"?
            </div>
            <div style={{ color: colors.muted, fontSize: 12, marginBottom: 20 }}>
              Questa azione non può essere annullata.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmDel(null)}
                style={{ ...S.btn, ...S.btnGhost, flex: 1 }}
              >
                Annulla
              </button>
              <button
                onClick={() => doDelete(confirmDel.id)}
                style={{ ...S.btn, flex: 1, background: colors.red }}
              >
                Elimina
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
