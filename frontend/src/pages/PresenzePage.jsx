import { useEffect, useMemo, useState } from "react";
import { attendanceApi, bookingsApi, membersApi } from "../api/services";
import { S, colors, fonts, formatDate, todayStr, SLOTS } from "../styles/theme";

export default function PresenzePage() {
  const [date, setDate] = useState(todayStr());
  const [slot, setSlot] = useState(SLOTS[0]);
  const [members, setMembers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [entries, setEntries] = useState([]); // [{ member_id, name, present, note }]
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState([]);
  const [message, setMessage] = useState(null);
  const [addSearch, setAddSearch] = useState("");

  // Load members once
  useEffect(() => {
    membersApi
      .list()
      .then((r) => setMembers(r.data || []))
      .catch(() => {});
  }, []);

  // Load recent attendances (last 7 days)
  const loadRecent = async () => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);
    try {
      const r = await attendanceApi.list({
        date_from: from.toISOString().slice(0, 10),
        date_to: to.toISOString().slice(0, 10),
      });
      setRecent(r.data || []);
    } catch {
      setRecent([]);
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

  // Load bookings whenever date changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    bookingsApi
      .list({ date_from: date, date_to: date })
      .then((r) => {
        if (!cancelled) setBookings(r.data || []);
      })
      .catch(() => !cancelled && setBookings([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date]);

  // When bookings or slot change, find matching booking and prefill entries
  useEffect(() => {
    const match = bookings.find((b) => (b.slot || "").startsWith(slot));
    setBooking(match || null);
    if (match) {
      const arr = [];
      if (match.pope) {
        arr.push({
          member_id: match.pope.id,
          name: `${match.pope.nome || ""} ${match.pope.cognome || ""}`.trim(),
          role: "Pope",
          present: true,
          note: "",
        });
      } else if (match.pope_id) {
        const m = members.find((x) => x.id === match.pope_id);
        if (m)
          arr.push({
            member_id: m.id,
            name: `${m.nome} ${m.cognome}`,
            role: "Pope",
            present: true,
            note: "",
          });
      }
      const parts = match.participants || match.partecipanti || [];
      for (const p of parts) {
        const id = p.id || p.member_id;
        if (!id || arr.some((e) => e.member_id === id)) continue;
        const m = members.find((x) => x.id === id) || p;
        arr.push({
          member_id: id,
          name: `${m.nome || ""} ${m.cognome || ""}`.trim(),
          role: "Partecipante",
          present: true,
          note: "",
        });
      }
      setEntries(arr);
    } else {
      setEntries([]);
    }
  }, [bookings, slot, members]);

  const toggle = (idx) =>
    setEntries((e) =>
      e.map((x, i) => (i === idx ? { ...x, present: !x.present } : x))
    );

  const updateNote = (idx, val) =>
    setEntries((e) => e.map((x, i) => (i === idx ? { ...x, note: val } : x)));

  const removeEntry = (idx) =>
    setEntries((e) => e.filter((_, i) => i !== idx));

  const addMember = (m) => {
    if (entries.some((e) => e.member_id === m.id)) return;
    setEntries((e) => [
      ...e,
      {
        member_id: m.id,
        name: `${m.nome} ${m.cognome}`,
        role: "Aggiunto",
        present: true,
        note: "",
      },
    ]);
    setAddSearch("");
  };

  const filteredAdd = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    if (!q) return [];
    return members
      .filter((m) => !entries.some((e) => e.member_id === m.id))
      .filter((m) => `${m.nome} ${m.cognome}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [addSearch, members, entries]);

  const submit = async () => {
    if (entries.length === 0) {
      setMessage({ type: "err", text: "Nessun socio da registrare." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await attendanceApi.bulk({
        date,
        slot,
        booking_id: booking?.id || null,
        entries: entries.map((e) => ({
          member_id: e.member_id,
          present: e.present,
          note: e.note || null,
        })),
      });
      setMessage({ type: "ok", text: "Presenze registrate." });
      await loadRecent();
    } catch {
      setMessage({ type: "err", text: "Errore nel salvataggio." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.container}>
      <h1 style={S.title}>Presenze</h1>
      <p style={S.subtitle}>Registrazione delle presenze per uscita</p>

      {message && (
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            backgroundColor: (message.type === "ok" ? colors.green : colors.red) + "22",
            border: `1px solid ${message.type === "ok" ? colors.green : colors.red}`,
            borderRadius: 8,
            color: message.type === "ok" ? colors.green : colors.red,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Date & slot selector */}
      <div style={{ ...S.card, marginTop: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={S.label}>Data</label>
          <input type="date" style={S.input} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={S.label}>Slot</label>
          <select style={S.input} value={slot} onChange={(e) => setSlot(e.target.value)}>
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 2, minWidth: 220, display: "flex", alignItems: "flex-end" }}>
          <div style={{ color: colors.muted, fontSize: 13 }}>
            {loading
              ? "Caricamento prenotazioni..."
              : booking
              ? `Prenotazione trovata: ${booking.boat?.nome || booking.boat?.name || "barca"} · ${
                  (entries.length)
                } soci precompilati`
              : "Nessuna prenotazione: aggiungi i soci manualmente."}
          </div>
        </div>
      </div>

      {/* Entries table */}
      <div style={{ ...S.card, marginTop: 20 }}>
        <h3 style={{ fontFamily: fonts.display, color: colors.gold, fontSize: 18, margin: "0 0 12px" }}>
          Registrazione
        </h3>

        {entries.length === 0 ? (
          <p style={{ color: colors.muted }}>Nessun socio aggiunto.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: colors.muted, fontSize: 11, textTransform: "uppercase" }}>
                <th style={{ padding: "8px 6px" }}>Presente</th>
                <th style={{ padding: "8px 6px" }}>Socio</th>
                <th style={{ padding: "8px 6px" }}>Ruolo uscita</th>
                <th style={{ padding: "8px 6px" }}>Nota</th>
                <th style={{ padding: "8px 6px" }}></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, idx) => (
                <tr key={e.member_id} style={{ color: colors.foam }}>
                  <td style={{ padding: "8px 6px", borderBottom: `1px solid ${colors.lagoon}22` }}>
                    <input
                      type="checkbox"
                      checked={e.present}
                      onChange={() => toggle(idx)}
                      style={{ transform: "scale(1.3)", cursor: "pointer" }}
                    />
                  </td>
                  <td style={{ padding: "8px 6px", borderBottom: `1px solid ${colors.lagoon}22` }}>
                    {e.name}
                  </td>
                  <td style={{ padding: "8px 6px", borderBottom: `1px solid ${colors.lagoon}22`, color: colors.muted }}>
                    {e.role}
                  </td>
                  <td style={{ padding: "8px 6px", borderBottom: `1px solid ${colors.lagoon}22` }}>
                    <input
                      style={{ ...S.input, padding: "6px 10px", fontSize: 13 }}
                      value={e.note}
                      onChange={(ev) => updateNote(idx, ev.target.value)}
                      placeholder="opzionale"
                    />
                  </td>
                  <td style={{ padding: "8px 6px", borderBottom: `1px solid ${colors.lagoon}22`, textAlign: "right" }}>
                    <button
                      style={{ ...S.btnSmall, ...S.btnRed }}
                      onClick={() => removeEntry(idx)}
                      type="button"
                    >
                      Rimuovi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Add member */}
        <div style={{ marginTop: 16, position: "relative" }}>
          <label style={S.label}>Aggiungi socio</label>
          <input
            style={S.input}
            value={addSearch}
            onChange={(e) => setAddSearch(e.target.value)}
            placeholder="Cerca per nome o cognome..."
          />
          {filteredAdd.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                backgroundColor: colors.deep,
                border: `1px solid ${colors.lagoon}`,
                borderRadius: 6,
                marginTop: 4,
                zIndex: 10,
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              {filteredAdd.map((m) => (
                <div
                  key={m.id}
                  onClick={() => addMember(m)}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    color: colors.foam,
                    borderBottom: `1px solid ${colors.lagoon}22`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.water)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  {m.nome} {m.cognome}
                  <span style={{ color: colors.muted, fontSize: 11, marginLeft: 8 }}>
                    {m.ruolo}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button
            type="button"
            style={{ ...S.btn, ...S.btnGold, opacity: saving ? 0.5 : 1 }}
            onClick={submit}
            disabled={saving || entries.length === 0}
          >
            {saving ? "Salvataggio..." : "Registra presenze"}
          </button>
        </div>
      </div>

      {/* Recent */}
      <div style={{ ...S.card, marginTop: 20 }}>
        <h3 style={{ fontFamily: fonts.display, color: colors.gold, fontSize: 18, margin: "0 0 12px" }}>
          Presenze recenti (ultimi 7 giorni)
        </h3>
        {recent.length === 0 ? (
          <p style={{ color: colors.muted }}>Nessuna presenza registrata.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: colors.muted, fontSize: 11, textTransform: "uppercase" }}>
                <th style={{ padding: "6px" }}>Data</th>
                <th style={{ padding: "6px" }}>Slot</th>
                <th style={{ padding: "6px" }}>Socio</th>
                <th style={{ padding: "6px" }}>Presente</th>
                <th style={{ padding: "6px" }}>Nota</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((a) => (
                <tr key={a.id} style={{ color: colors.foam }}>
                  <td style={{ padding: "6px", borderBottom: `1px solid ${colors.lagoon}22` }}>
                    {formatDate(a.date)}
                  </td>
                  <td style={{ padding: "6px", borderBottom: `1px solid ${colors.lagoon}22` }}>
                    {a.slot}
                  </td>
                  <td style={{ padding: "6px", borderBottom: `1px solid ${colors.lagoon}22` }}>
                    {a.member
                      ? `${a.member.nome} ${a.member.cognome}`
                      : `#${a.member_id}`}
                  </td>
                  <td style={{ padding: "6px", borderBottom: `1px solid ${colors.lagoon}22` }}>
                    <span
                      style={{
                        ...S.badge,
                        backgroundColor: (a.present ? colors.green : colors.red) + "33",
                        color: a.present ? colors.green : colors.red,
                      }}
                    >
                      {a.present ? "Sì" : "No"}
                    </span>
                  </td>
                  <td style={{ padding: "6px", borderBottom: `1px solid ${colors.lagoon}22`, color: colors.muted }}>
                    {a.note || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
