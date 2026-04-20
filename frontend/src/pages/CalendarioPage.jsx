import { useState, useEffect, useMemo } from "react";
import { boatsApi, bookingsApi, membersApi } from "../api/services";
import {
  colors,
  fonts,
  S,
  SLOTS,
  DAYS_LABELS,
  TIPI_BARCA,
  RUOLI,
  getDays,
  todayStr,
} from "../styles/theme";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";

const tipoInfo = (t) => TIPI_BARCA[t] || TIPI_BARCA.altro;

export default function CalendarioPage() {
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [boats, setBoats] = useState([]);
  const [members, setMembers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modal, setModal] = useState(null); // { mode: 'create'|'view', day, slot, booking? }
  const [form, setForm] = useState({
    slot: SLOTS[2],
    boat_id: "",
    pope_id: "",
    participants: [],
    note: "",
  });
  const [saving, setSaving] = useState(false);

  const today = todayStr();
  const base = new Date();
  base.setDate(base.getDate() + weekOffset * 7);
  const days = useMemo(() => getDays(base), [weekOffset]);
  const dateFrom = days[0].toISOString().split("T")[0];
  const dateTo = days[6].toISOString().split("T")[0];

  // Load boats & members once
  useEffect(() => {
    (async () => {
      try {
        const [bRes, mRes] = await Promise.all([
          boatsApi.list(),
          membersApi.list(),
        ]);
        setBoats(bRes.data || []);
        setMembers(mRes.data || []);
      } catch (e) {
        setError("Errore nel caricamento dei dati.");
      }
    })();
  }, []);

  // Load bookings for the visible week
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await bookingsApi.list({
          date_from: dateFrom,
          date_to: dateTo,
        });
        setBookings(res.data || []);
        setError(null);
      } catch (e) {
        setError("Errore nel caricamento delle prenotazioni.");
      } finally {
        setLoading(false);
      }
    })();
  }, [dateFrom, dateTo]);

  // Bookings map keyed by `${date}_${slot}_${boat_id}`
  const bookingsMap = useMemo(() => {
    const map = {};
    for (const b of bookings) {
      const key = `${b.date}_${b.slot}_${b.boat_id}`;
      map[key] = b;
    }
    return map;
  }, [bookings]);

  const cellBookings = (day, slot) => {
    const ds = day.toISOString().split("T")[0];
    return bookings.filter((b) => b.date === ds && b.slot === slot);
  };

  const activeBoats = boats.filter((b) => b.status === "attiva");
  const popes = members.filter((m) => m.ruolo === "pope");

  const reload = async () => {
    try {
      const res = await bookingsApi.list({
        date_from: dateFrom,
        date_to: dateTo,
      });
      setBookings(res.data || []);
    } catch (e) {
      setError("Errore nel ricaricamento.");
    }
  };

  const openCreate = (day, slot) => {
    const firstBoat = activeBoats[0];
    const firstPope = popes[0];
    setForm({
      slot,
      boat_id: firstBoat?.id || "",
      pope_id: firstPope?.id || "",
      participants: [],
      note: "",
    });
    setModal({ mode: "create", day, slot });
  };

  const openView = (booking, day, slot) => {
    setForm({
      slot: booking.slot,
      boat_id: booking.boat_id,
      pope_id: booking.pope_id || "",
      participants: booking.participants || [],
      note: booking.note || "",
    });
    setModal({ mode: "view", day, slot, booking });
  };

  const togglePart = (id) =>
    setForm((f) => ({
      ...f,
      participants: f.participants.includes(id)
        ? f.participants.filter((x) => x !== id)
        : [...f.participants, id],
    }));

  const handleCreate = async () => {
    if (!form.boat_id || !form.pope_id) return;
    setSaving(true);
    try {
      const ds = modal.day.toISOString().split("T")[0];
      await bookingsApi.create({
        date: ds,
        slot: form.slot,
        boat_id: parseInt(form.boat_id),
        pope_id: parseInt(form.pope_id),
        participants: form.participants.map((x) => parseInt(x)),
        note: form.note,
      });
      await reload();
      setModal(null);
    } catch (e) {
      setError("Errore nella creazione della prenotazione.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await bookingsApi.update(modal.booking.id, {
        slot: form.slot,
        boat_id: parseInt(form.boat_id),
        pope_id: parseInt(form.pope_id),
        participants: form.participants.map((x) => parseInt(x)),
        note: form.note,
      });
      await reload();
      setModal(null);
    } catch (e) {
      setError("Errore nell'aggiornamento.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Eliminare questa prenotazione?")) return;
    setSaving(true);
    try {
      await bookingsApi.remove(modal.booking.id);
      await reload();
      setModal(null);
    } catch (e) {
      setError("Errore nell'eliminazione.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await bookingsApi.confirm(modal.booking.id);
      await reload();
      setModal(null);
    } catch (e) {
      setError("Errore nella conferma.");
    } finally {
      setSaving(false);
    }
  };

  const canEdit = (b) => {
    if (!user || !b) return false;
    if (user.role === "admin") return true;
    // pope may edit his own bookings
    if (b.pope_id && user.member_id === b.pope_id) return true;
    return false;
  };

  const selectedBoat = boats.find((b) => b.id === parseInt(form.boat_id));
  const altriMembri = members.filter(
    (m) => m.ruolo !== "pope" && m.id !== parseInt(form.pope_id)
  );

  return (
    <div style={S.container}>
      <h1 style={S.title}>Calendario Uscite</h1>
      <p style={S.subtitle}>
        Prenota una barca, gestisci le uscite settimanali
      </p>

      {error && (
        <div
          style={{
            background: `${colors.red}22`,
            color: colors.red,
            border: `1px solid ${colors.red}55`,
            borderRadius: 8,
            padding: "10px 14px",
            marginTop: 14,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Week navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "20px 0 14px",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          style={{
            ...S.btn,
            backgroundColor: "transparent",
            border: `1px solid ${colors.muted}44`,
            color: colors.muted,
            padding: "8px 14px",
            fontSize: 13,
          }}
        >
          ← Precedente
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setWeekOffset(0)}
            style={{
              ...S.btn,
              backgroundColor: colors.gold,
              color: colors.deep,
              padding: "6px 14px",
              fontSize: 12,
            }}
          >
            Oggi
          </button>
          <div
            style={{
              color: colors.gold,
              fontFamily: fonts.display,
              fontSize: 17,
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            {days[0].toLocaleDateString("it-IT", {
              day: "numeric",
              month: "long",
            })}{" "}
            –{" "}
            {days[6].toLocaleDateString("it-IT", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          style={{
            ...S.btn,
            backgroundColor: "transparent",
            border: `1px solid ${colors.muted}44`,
            color: colors.muted,
            padding: "8px 14px",
            fontSize: 13,
          }}
        >
          Successiva →
        </button>
      </div>

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: colors.muted,
            fontSize: 14,
          }}
        >
          Caricamento...
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 640,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    width: 60,
                    background: colors.deep,
                    padding: "10px 4px",
                    borderBottom: `1px solid ${colors.lagoon}33`,
                  }}
                ></th>
                {days.map((d, i) => {
                  const isToday = d.toISOString().split("T")[0] === today;
                  return (
                    <th
                      key={i}
                      style={{
                        background: isToday ? colors.lagoon : colors.deep,
                        padding: "10px 4px",
                        borderBottom: `1px solid ${colors.lagoon}33`,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          color: isToday ? "#ffffffcc" : colors.muted,
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        {DAYS_LABELS[i]}
                      </div>
                      <div
                        style={{
                          color: isToday ? "#fff" : colors.foam,
                          fontSize: 17,
                          fontWeight: 700,
                        }}
                      >
                        {d.getDate()}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slot) => (
                <tr key={slot}>
                  <td
                    style={{
                      background: colors.deep,
                      color: colors.gold,
                      fontWeight: 700,
                      fontSize: 11,
                      textAlign: "center",
                      padding: "4px 2px",
                      border: `1px solid ${colors.lagoon}18`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {slot}
                  </td>
                  {days.map((d, i) => {
                    const cells = cellBookings(d, slot);
                    const ds = d.toISOString().split("T")[0];
                    const isPast = ds < today;
                    return (
                      <td
                        key={i}
                        onClick={() =>
                          !isPast && cells.length === 0 && openCreate(d, slot)
                        }
                        style={{
                          border: `1px solid ${colors.lagoon}18`,
                          padding: 3,
                          verticalAlign: "top",
                          minWidth: 80,
                          background: cells.length
                            ? `${colors.lagoon}18`
                            : "transparent",
                          cursor:
                            isPast
                              ? "default"
                              : cells.length === 0
                              ? "pointer"
                              : "default",
                          opacity: isPast ? 0.5 : 1,
                        }}
                      >
                        {cells.map((b) => {
                          const boat = boats.find((f) => f.id === b.boat_id);
                          const pope = members.find(
                            (m) => m.id === b.pope_id
                          );
                          return (
                            <div
                              key={b.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isPast) openView(b, d, slot);
                              }}
                              style={{
                                background: boat?.color || colors.lagoon,
                                borderRadius: 4,
                                padding: "3px 6px",
                                marginBottom: 2,
                                fontSize: 10,
                                color: "#fff",
                                cursor: isPast ? "default" : "pointer",
                              }}
                            >
                              <div style={{ fontWeight: 700 }}>
                                {tipoInfo(boat?.tipo).icon}{" "}
                                {boat?.name?.split(" ")[0] || "—"}
                              </div>
                              {pope && (
                                <div style={{ opacity: 0.9 }}>
                                  ⚓ {pope.name?.split(" ")[0]}
                                </div>
                              )}
                              {!b.confirmed && <div>⏳</div>}
                            </div>
                          );
                        })}
                        {!isPast && cells.length === 0 && (
                          <div
                            style={{
                              color: `${colors.muted}44`,
                              textAlign: "center",
                              fontSize: 18,
                              lineHeight: "34px",
                            }}
                          >
                            +
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          ...S.card,
          marginTop: 20,
          padding: 14,
        }}
      >
        <div
          style={{
            color: colors.muted,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          Legenda Flotta
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {boats.map((b) => (
            <div
              key={b.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: colors.foam,
                opacity: b.status === "attiva" ? 1 : 0.5,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: b.color,
                  border: `1px solid #fff3`,
                }}
              />
              {b.name}
            </div>
          ))}
          {boats.length === 0 && (
            <span style={{ color: colors.muted, fontSize: 12 }}>
              Nessuna barca in flotta.
            </span>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && modal.mode === "create" && (
        <Modal
          title="Nuova Uscita"
          onClose={() => setModal(null)}
          maxWidth={460}
        >
          <div style={{ color: colors.muted, fontSize: 12, marginBottom: 14 }}>
            {modal.day.toLocaleDateString("it-IT", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>

          <label style={S.label}>Fascia oraria</label>
          <select
            value={form.slot}
            onChange={(e) =>
              setForm((f) => ({ ...f, slot: e.target.value }))
            }
            style={S.input}
          >
            {SLOTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <label style={{ ...S.label, marginTop: 14 }}>Imbarcazione</label>
          <select
            value={form.boat_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, boat_id: e.target.value }))
            }
            style={S.input}
          >
            <option value="">— seleziona —</option>
            {activeBoats.map((b) => (
              <option key={b.id} value={b.id}>
                {tipoInfo(b.tipo).icon} {b.name} ({b.seats}{" "}
                {b.seats === 1 ? "posto" : "posti"})
              </option>
            ))}
          </select>

          <label style={{ ...S.label, marginTop: 14 }}>
            ⚓ Pope (responsabile)
          </label>
          <select
            value={form.pope_id}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                pope_id: e.target.value,
                participants: [],
              }))
            }
            style={S.input}
          >
            <option value="">— seleziona pope —</option>
            {popes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <label style={{ ...S.label, marginTop: 14 }}>Partecipanti</label>
          <div
            style={{
              background: `${colors.deep}88`,
              border: `1px solid ${colors.lagoon}44`,
              borderRadius: 8,
              padding: 8,
              maxHeight: 180,
              overflowY: "auto",
            }}
          >
            {!form.pope_id ? (
              <div
                style={{
                  color: colors.muted,
                  fontSize: 11,
                  textAlign: "center",
                  padding: 8,
                }}
              >
                Seleziona prima un pope
              </div>
            ) : altriMembri.length === 0 ? (
              <div
                style={{
                  color: colors.muted,
                  fontSize: 11,
                  textAlign: "center",
                  padding: 8,
                }}
              >
                Nessun altro socio
              </div>
            ) : (
              altriMembri.map((m) => {
                const r = RUOLI[m.ruolo] || RUOLI.ospite;
                const sel = form.participants.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => togglePart(m.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 6,
                      cursor: "pointer",
                      background: sel ? `${r.color}22` : "transparent",
                      marginBottom: 2,
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: `2px solid ${sel ? r.color : colors.muted}`,
                        background: sel ? r.color : "transparent",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {sel && (
                        <span style={{ color: "#fff", fontSize: 10 }}>✓</span>
                      )}
                    </div>
                    <span
                      style={{ color: colors.foam, fontSize: 13, flex: 1 }}
                    >
                      {m.name}
                    </span>
                    <span
                      style={{
                        ...S.badge,
                        background: `${r.color}22`,
                        color: r.color,
                        border: `1px solid ${r.color}55`,
                      }}
                    >
                      {r.icon} {r.badge}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <label style={{ ...S.label, marginTop: 14 }}>Note</label>
          <input
            value={form.note}
            onChange={(e) =>
              setForm((f) => ({ ...f, note: e.target.value }))
            }
            placeholder="opzionale"
            style={S.input}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button
              onClick={() => setModal(null)}
              style={{
                ...S.btn,
                flex: 1,
                backgroundColor: "transparent",
                border: `1px solid ${colors.muted}44`,
                color: colors.muted,
              }}
            >
              Annulla
            </button>
            <button
              onClick={handleCreate}
              disabled={!form.boat_id || !form.pope_id || saving}
              style={{
                ...S.btn,
                flex: 2,
                backgroundColor:
                  form.boat_id && form.pope_id && !saving
                    ? colors.lagoon
                    : colors.muted,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Salvataggio..." : "✓ Prenota uscita"}
            </button>
          </div>
        </Modal>
      )}

      {modal && modal.mode === "view" && (
        <Modal
          title="Dettaglio Prenotazione"
          onClose={() => setModal(null)}
          maxWidth={460}
        >
          {(() => {
            const b = modal.booking;
            const boat = boats.find((x) => x.id === b.boat_id);
            const pope = members.find((m) => m.id === b.pope_id);
            const editable = canEdit(b);
            return (
              <>
                <div
                  style={{
                    color: colors.muted,
                    fontSize: 12,
                    marginBottom: 14,
                  }}
                >
                  {new Date(b.date + "T12:00").toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  • {b.slot}
                </div>

                <div
                  style={{
                    ...S.card,
                    marginBottom: 14,
                    borderLeft: `4px solid ${boat?.color || colors.lagoon}`,
                  }}
                >
                  <div
                    style={{
                      color: colors.foam,
                      fontWeight: 700,
                      fontSize: 15,
                    }}
                  >
                    {tipoInfo(boat?.tipo).icon} {boat?.name}
                  </div>
                  {pope && (
                    <div
                      style={{
                        color: colors.muted,
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      ⚓ Pope:{" "}
                      <span style={{ color: colors.gold }}>{pope.name}</span>
                    </div>
                  )}
                  <div
                    style={{
                      color: b.confirmed ? colors.green : colors.gold,
                      fontSize: 11,
                      fontWeight: 700,
                      marginTop: 6,
                    }}
                  >
                    {b.confirmed ? "✓ Confermata" : "⏳ In attesa di conferma"}
                  </div>
                </div>

                {editable && (
                  <>
                    <label style={S.label}>Fascia oraria</label>
                    <select
                      value={form.slot}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, slot: e.target.value }))
                      }
                      style={S.input}
                    >
                      {SLOTS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>

                    <label style={{ ...S.label, marginTop: 14 }}>
                      Imbarcazione
                    </label>
                    <select
                      value={form.boat_id}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, boat_id: e.target.value }))
                      }
                      style={S.input}
                    >
                      {activeBoats.map((bb) => (
                        <option key={bb.id} value={bb.id}>
                          {tipoInfo(bb.tipo).icon} {bb.name}
                        </option>
                      ))}
                    </select>

                    <label style={{ ...S.label, marginTop: 14 }}>Pope</label>
                    <select
                      value={form.pope_id}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, pope_id: e.target.value }))
                      }
                      style={S.input}
                    >
                      {popes.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>

                    <label style={{ ...S.label, marginTop: 14 }}>Note</label>
                    <input
                      value={form.note}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, note: e.target.value }))
                      }
                      style={S.input}
                    />
                  </>
                )}

                {b.note && !editable && (
                  <div
                    style={{
                      color: colors.muted,
                      fontSize: 12,
                      marginTop: 4,
                      fontStyle: "italic",
                    }}
                  >
                    {b.note}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 20,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => setModal(null)}
                    style={{
                      ...S.btn,
                      flex: 1,
                      backgroundColor: "transparent",
                      border: `1px solid ${colors.muted}44`,
                      color: colors.muted,
                    }}
                  >
                    Chiudi
                  </button>
                  {editable && !b.confirmed && user?.role === "admin" && (
                    <button
                      onClick={handleConfirm}
                      disabled={saving}
                      style={{
                        ...S.btn,
                        backgroundColor: colors.green,
                        color: "#fff",
                      }}
                    >
                      ✓ Conferma
                    </button>
                  )}
                  {editable && (
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      style={{
                        ...S.btn,
                        backgroundColor: colors.lagoon,
                        color: "#fff",
                      }}
                    >
                      Salva
                    </button>
                  )}
                  {editable && (
                    <button
                      onClick={handleDelete}
                      disabled={saving}
                      style={{
                        ...S.btn,
                        backgroundColor: colors.red,
                        color: "#fff",
                      }}
                    >
                      🗑 Elimina
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
