import { useState, useEffect } from "react";

// ── palette ───────────────────────────────────────────────────────────────────
const C = {
  water: "#1a3a4a", deep: "#0d2535", foam: "#e8f4f8",
  lagoon: "#2d7d9a", gold: "#c8963e", red: "#c0392b",
  green: "#27ae60", muted: "#6b8fa3", orange: "#d35400",
};

// ── ruoli della remiera ───────────────────────────────────────────────────────
const RUOLI = {
  pope:   { label: "Pope",   badge: "PP", desc: "Responsabile barca e ciurma", color: "#c8963e", icon: "⚓" },
  paron:  { label: "Paron",  badge: "PA", desc: "Proprietario imbarcazione",   color: "#2d7d9a", icon: "🏛" },
  provin: { label: "Provin", badge: "PV", desc: "Passeggero vogante",          color: "#27ae60", icon: "🚣" },
  ospite: { label: "Ospite", badge: "OS", desc: "Passeggero (ass.vo)",         color: "#6b8fa3", icon: "👤" },
};

// ── tipi barca ────────────────────────────────────────────────────────────────
const TIPI_BARCA = [
  { value: "mascareta",   label: "Mascareta",    icon: "🚣",  defaultSeats: 1 },
  { value: "sandolo-w",   label: "Sandolo W",    icon: "🚣‍♂️", defaultSeats: 2 },
  { value: "sandolo-4",   label: "Sandolo 4",    icon: "⛵",  defaultSeats: 4 },
  { value: "gondolino-4", label: "Gondolino 4",  icon: "⛵",  defaultSeats: 4 },
  { value: "caorlina-6",  label: "Caorlina 6",   icon: "🛶",  defaultSeats: 6 },
  { value: "altro",       label: "Altra",        icon: "🚤",  defaultSeats: 2 },
];

const BOAT_COLORS = ["#c0392b","#2980b9","#8e44ad","#16a085","#c8963e","#2d7d9a","#d35400","#27ae60","#1a3a4a","#7f8c8d"];

const FLEET_INIT = [
  { id: 1, name: "Bissa Rossa",  tipo: "mascareta",   seats: 1, color: "#c0392b", available: true,  note: "" },
  { id: 2, name: "Bissa Blu",    tipo: "mascareta",   seats: 1, color: "#2980b9", available: true,  note: "" },
  { id: 3, name: "La Serena",    tipo: "sandolo-w",   seats: 2, color: "#8e44ad", available: false, note: "In manutenzione" },
  { id: 4, name: "Laguna Viva",  tipo: "sandolo-4",   seats: 4, color: "#16a085", available: true,  note: "" },
  { id: 5, name: "Ca' d'Oro",    tipo: "gondolino-4", seats: 4, color: "#c8963e", available: true,  note: "" },
  { id: 6, name: "Adriatica",    tipo: "caorlina-6",  seats: 6, color: "#2d7d9a", available: true,  note: "" },
  { id: 7, name: "Serenissima",  tipo: "caorlina-6",  seats: 6, color: "#1a3a4a", available: false, note: "Revisione annuale" },
];

const MEMBERS_INIT = [
  { id: 1, name: "Marco Venier",    ruolo: "pope",   tessera: "RC001", email: "marco@remiera.it",  note: "" },
  { id: 2, name: "Chiara Morosini", ruolo: "provin", tessera: "RC002", email: "chiara@remiera.it", note: "" },
  { id: 3, name: "Luca Grimani",    ruolo: "paron",  tessera: "RC003", email: "luca@remiera.it",   note: "Proprietario Ca' d'Oro" },
  { id: 4, name: "Sara Contarini",  ruolo: "ospite", tessera: "RC004", email: "sara@email.it",     note: "Assicurazione scad. 31/12" },
  { id: 5, name: "Paolo Dandolo",   ruolo: "provin", tessera: "RC005", email: "paolo@remiera.it",  note: "" },
  { id: 6, name: "Elena Foscarini", ruolo: "pope",   tessera: "RC006", email: "elena@remiera.it",  note: "" },
];

const SLOTS = ["06:00","07:30","09:00","10:30","14:00","15:30","17:00","18:30"];

// ── helpers ───────────────────────────────────────────────────────────────────
function getDays(baseDate) {
  const days = [], start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay() + 1);
  for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
  return days;
}
const todayStr = () => new Date().toISOString().split("T")[0];
const tipoInfo = (t) => TIPI_BARCA.find(x => x.value === t) || TIPI_BARCA[TIPI_BARCA.length - 1];

function initBookings(fleet, members) {
  const b = {}, now = new Date();
  for (let w = -1; w <= 2; w++) for (let d = 0; d < 7; d++) {
    if (Math.random() > 0.65) {
      const date = new Date(now); date.setDate(date.getDate() - date.getDay() + 1 + w * 7 + d);
      const ds = date.toISOString().split("T")[0];
      const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
      const boat = fleet[Math.floor(Math.random() * fleet.length)];
      const popes = members.filter(m => m.ruolo === "pope");
      const pope = popes[Math.floor(Math.random() * popes.length)];
      if (!b[ds]) b[ds] = [];
      b[ds].push({ id: Date.now() + w * 100 + d, date: ds, slot, boatId: boat.id, popeId: pope?.id, partecipanti: [], confirmed: Math.random() > 0.4 });
    }
  }
  return b;
}

// ── stili condivisi ───────────────────────────────────────────────────────────
const S = {
  btn:   { border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: 13, transition: "all 0.2s", padding: "8px 16px" },
  input: { width: "100%", background: "#0d2535", border: `1px solid ${C.lagoon}`, borderRadius: 8, color: C.foam, padding: "8px 10px", fontFamily: "'Lato', sans-serif", fontSize: 13, boxSizing: "border-box" },
  label: { display: "block", color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, marginTop: 14 },
  card:  { background: C.deep, border: `1px solid ${C.lagoon}22`, borderRadius: 10, padding: "12px 16px" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// NAV
// ═══════════════════════════════════════════════════════════════════════════════
function NavBar({ view, setView, notifications }) {
  const tabs = [
    { id: "calendario",   icon: "📅", label: "Calendario" },
    { id: "flotta",       icon: "🚣", label: "Flotta" },
    { id: "soci",         icon: "👥", label: "Soci" },
    { id: "prenotazioni", icon: "📋", label: "Prenotaz." },
  ];
  return (
    <div style={{ background: C.deep, borderBottom: `2px solid ${C.lagoon}`, position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 940, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0" }}>
          <span style={{ fontSize: 22 }}>🚣‍♂️</span>
          <div>
            <div style={{ color: C.gold, fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>REMIERA</div>
            <div style={{ color: C.muted, fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>Gestionale Barche</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setView(t.id)} style={{
              background: view === t.id ? C.lagoon : "transparent", border: "none",
              color: view === t.id ? "#fff" : C.muted, padding: "8px 10px", borderRadius: 6,
              cursor: "pointer", fontFamily: "'Lato', sans-serif", fontSize: 11, fontWeight: 600,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
              <span style={{ fontSize: 15 }}>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>
        <div style={{ position: "relative", cursor: "pointer", padding: 8 }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          {notifications > 0 && <span style={{ position: "absolute", top: 4, right: 4, background: C.gold, color: C.deep, borderRadius: "50%", width: 16, height: 16, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{notifications}</span>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BADGE RUOLO
// ═══════════════════════════════════════════════════════════════════════════════
function RuoloBadge({ ruolo, small }) {
  const r = RUOLI[ruolo];
  if (!r) return null;
  return (
    <span style={{ background: `${r.color}22`, color: r.color, border: `1px solid ${r.color}55`, borderRadius: 6, padding: small ? "2px 6px" : "3px 10px", fontSize: small ? 10 : 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {r.icon} {r.badge}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDARIO
// ═══════════════════════════════════════════════════════════════════════════════
function CalendarioView({ bookings, setBookings, fleet, members }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ slot: SLOTS[2], boatId: "", popeId: "", partecipanti: [] });

  const base = new Date(); base.setDate(base.getDate() + weekOffset * 7);
  const days = getDays(base);
  const dayNames = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
  const today = todayStr();

  const getCell = (day, slot) => {
    const ds = day.toISOString().split("T")[0];
    return (bookings[ds] || []).filter(b => b.slot === slot);
  };

  const openModal = (day, slot) => {
    setModal({ day, slot });
    const firstBoat = fleet.filter(b => b.available)[0];
    const firstPope = members.filter(m => m.ruolo === "pope")[0];
    setForm({ slot, boatId: firstBoat?.id || "", popeId: firstPope?.id || "", partecipanti: [] });
  };

  const handleBook = () => {
    const ds = modal.day.toISOString().split("T")[0];
    const nb = { id: Date.now(), date: ds, slot: form.slot, boatId: parseInt(form.boatId), popeId: parseInt(form.popeId), partecipanti: form.partecipanti, confirmed: false };
    setBookings(prev => ({ ...prev, [ds]: [...(prev[ds] || []), nb] }));
    setModal(null);
  };

  const togglePart = (id) => setForm(f => ({
    ...f, partecipanti: f.partecipanti.includes(id) ? f.partecipanti.filter(x => x !== id) : [...f.partecipanti, id]
  }));

  const availableBoats = fleet.filter(b => b.available);
  const popes = members.filter(m => m.ruolo === "pope");
  const altriMembri = members.filter(m => m.ruolo !== "pope" && m.id !== parseInt(form.popeId));

  return (
    <div style={{ padding: 16, maxWidth: 940, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={() => setWeekOffset(w => w - 1)} style={{ ...S.btn, background: "transparent", border: `1px solid ${C.muted}44`, color: C.muted, fontSize: 12 }}>← Prec.</button>
        <div style={{ color: C.gold, fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, textAlign: "center" }}>
          {days[0].toLocaleDateString("it-IT", { day: "numeric", month: "long" })} – {days[6].toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)} style={{ ...S.btn, background: "transparent", border: `1px solid ${C.muted}44`, color: C.muted, fontSize: 12 }}>Succ. →</button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr>
              <th style={{ width: 52, background: C.deep, padding: "8px 4px", borderBottom: `1px solid ${C.lagoon}33` }}></th>
              {days.map((d, i) => {
                const isToday = d.toISOString().split("T")[0] === today;
                return (
                  <th key={i} style={{ background: isToday ? C.lagoon : C.deep, padding: "8px 4px", borderBottom: `1px solid ${C.lagoon}33`, textAlign: "center" }}>
                    <div style={{ color: isToday ? "#ffffffcc" : C.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{dayNames[i]}</div>
                    <div style={{ color: isToday ? "#fff" : C.foam, fontSize: 17, fontWeight: 700 }}>{d.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map(slot => (
              <tr key={slot}>
                <td style={{ background: C.deep, color: C.gold, fontWeight: 700, fontSize: 10, textAlign: "center", padding: "4px 2px", border: `1px solid ${C.lagoon}18`, whiteSpace: "nowrap" }}>{slot}</td>
                {days.map((d, i) => {
                  const cells = getCell(d, slot);
                  const isPast = d.toISOString().split("T")[0] < today;
                  return (
                    <td key={i} onClick={() => !isPast && openModal(d, slot)} style={{
                      border: `1px solid ${C.lagoon}18`, padding: 3, verticalAlign: "top", minWidth: 76,
                      background: cells.length ? `${C.lagoon}18` : "transparent",
                      cursor: isPast ? "default" : "pointer", opacity: isPast ? 0.5 : 1,
                    }}>
                      {cells.map(b => {
                        const boat = fleet.find(f => f.id === b.boatId);
                        const pope = members.find(m => m.id === b.popeId);
                        return (
                          <div key={b.id} style={{ background: boat?.color || C.lagoon, borderRadius: 4, padding: "2px 5px", marginBottom: 2, fontSize: 9, color: "#fff" }}>
                            <div style={{ fontWeight: 700 }}>{tipoInfo(boat?.tipo).icon} {boat?.name?.split(" ")[0]}</div>
                            {pope && <div style={{ opacity: 0.85 }}>⚓ {pope.name.split(" ")[0]}</div>}
                            {!b.confirmed && <div>⏳</div>}
                          </div>
                        );
                      })}
                      {!isPast && cells.length === 0 && <div style={{ color: `${C.muted}33`, textAlign: "center", fontSize: 16, lineHeight: "32px" }}>+</div>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        {fleet.filter(b => b.available).map(b => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.muted }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />{b.name}
          </div>
        ))}
      </div>

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "#000b", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.deep, border: `1px solid ${C.lagoon}`, borderRadius: 14, padding: 22, width: 380, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ color: C.gold, fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 2 }}>Nuova Uscita</div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
              {modal.day.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
            </div>

            <label style={S.label}>Fascia oraria</label>
            <select value={form.slot} onChange={e => setForm(f => ({ ...f, slot: e.target.value }))} style={S.input}>
              {SLOTS.map(s => <option key={s}>{s}</option>)}
            </select>

            <label style={S.label}>Imbarcazione</label>
            <select value={form.boatId} onChange={e => setForm(f => ({ ...f, boatId: e.target.value }))} style={S.input}>
              <option value="">— seleziona —</option>
              {availableBoats.map(b => (
                <option key={b.id} value={b.id}>{tipoInfo(b.tipo).icon} {b.name} ({b.tipo}, {b.seats} {b.seats === 1 ? "posto" : "posti"})</option>
              ))}
            </select>

            <label style={S.label}>⚓ Pope (responsabile)</label>
            <select value={form.popeId} onChange={e => setForm(f => ({ ...f, popeId: e.target.value, partecipanti: [] }))} style={S.input}>
              <option value="">— seleziona pope —</option>
              {popes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>

            <label style={S.label}>Partecipanti (provin / paron / ospiti)</label>
            <div style={{ background: "#0d253588", border: `1px solid ${C.lagoon}44`, borderRadius: 8, padding: 8, maxHeight: 160, overflowY: "auto" }}>
              {altriMembri.map(m => {
                const r = RUOLI[m.ruolo];
                const sel = form.partecipanti.includes(m.id);
                return (
                  <div key={m.id} onClick={() => togglePart(m.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 6, cursor: "pointer", background: sel ? `${r.color}22` : "transparent", marginBottom: 2 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${sel ? r.color : C.muted}`, background: sel ? r.color : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {sel && <span style={{ color: "#fff", fontSize: 10 }}>✓</span>}
                    </div>
                    <span style={{ color: C.foam, fontSize: 12, flex: 1 }}>{m.name}</span>
                    <RuoloBadge ruolo={m.ruolo} small />
                  </div>
                );
              })}
              {!form.popeId && <div style={{ color: C.muted, fontSize: 11, textAlign: "center", padding: 8 }}>Seleziona prima un pope</div>}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setModal(null)} style={{ ...S.btn, flex: 1, background: "transparent", border: `1px solid ${C.muted}44`, color: C.muted }}>Annulla</button>
              <button onClick={handleBook} disabled={!form.boatId || !form.popeId} style={{ ...S.btn, flex: 2, background: form.boatId && form.popeId ? C.lagoon : C.muted, color: "#fff" }}>✓ Prenota uscita</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOTTA
// ═══════════════════════════════════════════════════════════════════════════════
const EMPTY_BOAT = { name: "", tipo: "mascareta", seats: 1, color: BOAT_COLORS[0], available: true, note: "" };

function FlottaView({ fleet, setFleet }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_BOAT);
  const [confirmDel, setConfirmDel] = useState(null);

  const openAdd = () => { setForm(EMPTY_BOAT); setEditing(null); setShowAdd(true); };
  const openEdit = (b) => { setForm({ ...b }); setEditing(b.id); setShowAdd(true); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      setFleet(prev => prev.map(b => b.id === editing ? { ...form, id: editing, seats: parseInt(form.seats) } : b));
    } else {
      setFleet(prev => [...prev, { ...form, id: Date.now(), seats: parseInt(form.seats) }]);
    }
    setShowAdd(false);
  };

  const handleDelete = (id) => { setFleet(prev => prev.filter(b => b.id !== id)); setConfirmDel(null); };
  const toggleAvail = (id) => setFleet(prev => prev.map(b => b.id === id ? { ...b, available: !b.available } : b));

  const byTipo = TIPI_BARCA.map(t => ({ ...t, boats: fleet.filter(b => b.tipo === t.value) })).filter(t => t.boats.length > 0);

  return (
    <div style={{ padding: 16, maxWidth: 940, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ color: C.gold, fontFamily: "'Playfair Display', serif", fontSize: 20 }}>Flotta</div>
          <div style={{ color: C.muted, fontSize: 12 }}>{fleet.length} imbarcazioni • {fleet.filter(b => b.available).length} disponibili</div>
        </div>
        <button onClick={openAdd} style={{ ...S.btn, background: C.lagoon, color: "#fff" }}>+ Aggiungi barca</button>
      </div>

      {byTipo.map(t => (
        <div key={t.value} style={{ marginBottom: 24 }}>
          <div style={{ color: C.foam, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, borderBottom: `1px solid ${C.lagoon}33`, paddingBottom: 6, marginBottom: 10 }}>
            {t.icon} {t.label}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {t.boats.map(b => (
              <div key={b.id} style={{ ...S.card, border: `1px solid ${b.available ? b.color : C.muted}44`, position: "relative" }}>
                <div style={{ position: "absolute", top: 10, right: 10 }}>
                  <div onClick={() => toggleAvail(b.id)} style={{ width: 38, height: 20, borderRadius: 10, background: b.available ? C.green : C.red, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                    <div style={{ position: "absolute", top: 2, left: b.available ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                  </div>
                </div>
                <div style={{ fontSize: 26, marginBottom: 4 }}>{tipoInfo(b.tipo).icon}</div>
                <div style={{ color: C.foam, fontWeight: 700, fontSize: 14, paddingRight: 46 }}>{b.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: b.color, border: "1px solid #fff3", flexShrink: 0 }} />
                  <span style={{ color: C.muted, fontSize: 11 }}>{b.seats} {b.seats === 1 ? "posto" : "posti"}</span>
                </div>
                {b.note && <div style={{ color: C.muted, fontSize: 10, marginTop: 4, fontStyle: "italic" }}>{b.note}</div>}
                <div style={{ color: b.available ? C.green : C.red, fontSize: 10, marginTop: 6, fontWeight: 700 }}>{b.available ? "● Disponibile" : "● Non disponibile"}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button onClick={() => openEdit(b)} style={{ ...S.btn, flex: 1, background: `${C.lagoon}33`, color: C.foam, fontSize: 11, padding: "5px" }}>✏️ Modifica</button>
                  <button onClick={() => setConfirmDel(b.id)} style={{ ...S.btn, background: `${C.red}22`, color: C.red, fontSize: 11, padding: "5px 10px" }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {fleet.length === 0 && <div style={{ textAlign: "center", color: C.muted, padding: 40, fontSize: 14 }}>Nessuna barca in flotta. Aggiungine una!</div>}

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "#000b", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.deep, border: `1px solid ${C.lagoon}`, borderRadius: 14, padding: 22, width: 360, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ color: C.gold, fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 16 }}>{editing ? "Modifica barca" : "Nuova imbarcazione"}</div>

            <label style={S.label}>Nome barca</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="es. La Dogalessa" style={S.input} />

            <label style={S.label}>Tipo</label>
            <select value={form.tipo} onChange={e => {
              const t = TIPI_BARCA.find(x => x.value === e.target.value);
              setForm(f => ({ ...f, tipo: e.target.value, seats: t.defaultSeats }));
            }} style={S.input}>
              {TIPI_BARCA.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </select>

            <label style={S.label}>Posti vogatori</label>
            <input type="number" min={1} max={20} value={form.seats} onChange={e => setForm(f => ({ ...f, seats: e.target.value }))} style={S.input} />

            <label style={S.label}>Colore identificativo</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              {BOAT_COLORS.map(col => (
                <div key={col} onClick={() => setForm(f => ({ ...f, color: col }))} style={{ width: 28, height: 28, borderRadius: 6, background: col, cursor: "pointer", border: form.color === col ? "3px solid #fff" : "2px solid transparent", transition: "border 0.15s" }} />
              ))}
            </div>

            <label style={S.label}>Note (manutenzione ecc.)</label>
            <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="opzionale" style={S.input} />

            <label style={S.label}>Disponibilità</label>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              {[true, false].map(v => (
                <button key={String(v)} onClick={() => setForm(f => ({ ...f, available: v }))} style={{ ...S.btn, flex: 1, background: form.available === v ? (v ? C.green : C.red) : "transparent", border: `1px solid ${v ? C.green : C.red}66`, color: form.available === v ? "#fff" : C.muted, fontSize: 12 }}>
                  {v ? "✓ Disponibile" : "✗ Non disp."}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowAdd(false)} style={{ ...S.btn, flex: 1, background: "transparent", border: `1px solid ${C.muted}44`, color: C.muted }}>Annulla</button>
              <button onClick={handleSave} style={{ ...S.btn, flex: 2, background: C.lagoon, color: "#fff" }}>✓ {editing ? "Salva modifiche" : "Aggiungi"}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "#000b", zIndex: 201, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.deep, border: `1px solid ${C.red}`, borderRadius: 14, padding: 24, width: 320, maxWidth: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗑️</div>
            <div style={{ color: C.foam, fontWeight: 700, marginBottom: 6 }}>Eliminare {fleet.find(b => b.id === confirmDel)?.name}?</div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 20 }}>Questa azione non può essere annullata.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDel(null)} style={{ ...S.btn, flex: 1, background: "transparent", border: `1px solid ${C.muted}44`, color: C.muted }}>Annulla</button>
              <button onClick={() => handleDelete(confirmDel)} style={{ ...S.btn, flex: 1, background: C.red, color: "#fff" }}>Elimina</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOCI
// ═══════════════════════════════════════════════════════════════════════════════
const EMPTY_MEMBER = { name: "", ruolo: "provin", tessera: "", email: "", note: "" };

function SociView({ members, setMembers }) {
  const [filter, setFilter] = useState("tutti");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_MEMBER);
  const [confirmDel, setConfirmDel] = useState(null);

  const filtered = filter === "tutti" ? members : members.filter(m => m.ruolo === filter);

  const openAdd = () => { setForm(EMPTY_MEMBER); setEditing(null); setShowAdd(true); };
  const openEdit = (m) => { setForm({ ...m }); setEditing(m.id); setShowAdd(true); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      setMembers(prev => prev.map(m => m.id === editing ? { ...form, id: editing } : m));
    } else {
      setMembers(prev => [...prev, { ...form, id: Date.now() }]);
    }
    setShowAdd(false);
  };

  return (
    <div style={{ padding: 16, maxWidth: 940, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ color: C.gold, fontFamily: "'Playfair Display', serif", fontSize: 20 }}>Soci & Ospiti</div>
          <div style={{ color: C.muted, fontSize: 12 }}>{members.length} iscritti</div>
        </div>
        <button onClick={openAdd} style={{ ...S.btn, background: C.lagoon, color: "#fff" }}>+ Aggiungi</button>
      </div>

      {/* legenda ruoli */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 8, marginBottom: 16 }}>
        {Object.entries(RUOLI).map(([key, r]) => (
          <div key={key} style={{ background: `${r.color}11`, border: `1px solid ${r.color}33`, borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 13 }}>{r.icon} {r.label}</div>
            <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* filtri */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {["tutti", ...Object.keys(RUOLI)].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ ...S.btn, background: filter === f ? C.lagoon : "transparent", border: `1px solid ${filter === f ? C.lagoon : C.muted}44`, color: filter === f ? "#fff" : C.muted, padding: "5px 12px", fontSize: 12 }}>
            {f === "tutti" ? "Tutti" : `${RUOLI[f]?.icon} ${RUOLI[f]?.label}`}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {filtered.map(m => {
          const r = RUOLI[m.ruolo];
          return (
            <div key={m.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: `${r?.color}33`, border: `2px solid ${r?.color}88`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {r?.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.foam, fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                  <RuoloBadge ruolo={m.ruolo} small />
                  {m.tessera && <span style={{ color: C.muted, fontSize: 10 }}>#{m.tessera}</span>}
                  {m.email && <span style={{ color: C.muted, fontSize: 10 }}>{m.email}</span>}
                </div>
                {m.note && <div style={{ color: C.muted, fontSize: 10, marginTop: 3, fontStyle: "italic" }}>{m.note}</div>}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => openEdit(m)} style={{ ...S.btn, background: `${C.lagoon}33`, color: C.foam, fontSize: 12, padding: "5px 10px" }}>✏️</button>
                <button onClick={() => setConfirmDel(m.id)} style={{ ...S.btn, background: `${C.red}22`, color: C.red, fontSize: 12, padding: "5px 10px" }}>🗑</button>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "#000b", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.deep, border: `1px solid ${C.lagoon}`, borderRadius: 14, padding: 22, width: 360, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ color: C.gold, fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 16 }}>{editing ? "Modifica" : "Nuovo socio / ospite"}</div>

            <label style={S.label}>Nome e cognome</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="es. Giovanni Mocenigo" style={S.input} />

            <label style={S.label}>Ruolo</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
              {Object.entries(RUOLI).map(([key, r]) => (
                <button key={key} onClick={() => setForm(f => ({ ...f, ruolo: key }))} style={{ ...S.btn, background: form.ruolo === key ? `${r.color}33` : "transparent", border: `2px solid ${form.ruolo === key ? r.color : C.muted + "44"}`, color: form.ruolo === key ? r.color : C.muted, fontSize: 12, padding: "8px 8px", textAlign: "left", lineHeight: 1.3 }}>
                  {r.icon} {r.label}<br /><span style={{ fontSize: 9, fontWeight: 400, opacity: 0.8 }}>{r.desc}</span>
                </button>
              ))}
            </div>

            <label style={S.label}>N° tessera</label>
            <input value={form.tessera} onChange={e => setForm(f => ({ ...f, tessera: e.target.value }))} placeholder="es. RC007" style={S.input} />

            <label style={S.label}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="es. nome@email.it" style={S.input} />

            <label style={S.label}>Note</label>
            <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="opzionale" style={S.input} />

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowAdd(false)} style={{ ...S.btn, flex: 1, background: "transparent", border: `1px solid ${C.muted}44`, color: C.muted }}>Annulla</button>
              <button onClick={handleSave} style={{ ...S.btn, flex: 2, background: C.lagoon, color: "#fff" }}>✓ {editing ? "Salva" : "Aggiungi"}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "#000b", zIndex: 201, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.deep, border: `1px solid ${C.red}`, borderRadius: 14, padding: 24, width: 300, maxWidth: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
            <div style={{ color: C.foam, fontWeight: 700, marginBottom: 8 }}>Rimuovere {members.find(m => m.id === confirmDel)?.name}?</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDel(null)} style={{ ...S.btn, flex: 1, background: "transparent", border: `1px solid ${C.muted}44`, color: C.muted }}>Annulla</button>
              <button onClick={() => { setMembers(prev => prev.filter(m => m.id !== confirmDel)); setConfirmDel(null); }} style={{ ...S.btn, flex: 1, background: C.red, color: "#fff" }}>Rimuovi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRENOTAZIONI
// ═══════════════════════════════════════════════════════════════════════════════
function PrenotazioniView({ bookings, setBookings, fleet, members }) {
  const all = Object.values(bookings).flat().sort((a, b) => b.date.localeCompare(a.date) || b.slot.localeCompare(a.slot));
  const pending = all.filter(b => !b.confirmed);

  const confirm = (id) => setBookings(prev => {
    const nb = {};
    for (const [k, v] of Object.entries(prev)) nb[k] = v.map(b => b.id === id ? { ...b, confirmed: true } : b);
    return nb;
  });
  const cancel = (id) => setBookings(prev => {
    const nb = {};
    for (const [k, v] of Object.entries(prev)) nb[k] = v.filter(b => b.id !== id);
    return nb;
  });

  return (
    <div style={{ padding: 16, maxWidth: 940, margin: "0 auto" }}>
      <div style={{ color: C.gold, fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 2 }}>Prenotazioni</div>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>{all.length} totali • {pending.length} in attesa</div>

      {pending.length > 0 && (
        <div style={{ background: `${C.gold}0d`, border: `1px solid ${C.gold}44`, borderRadius: 10, padding: 14, marginBottom: 20 }}>
          <div style={{ color: C.gold, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>⏳ Da confermare ({pending.length})</div>
          {pending.map(b => {
            const boat = fleet.find(f => f.id === b.boatId);
            const pope = members.find(m => m.id === b.popeId);
            const nPart = b.partecipanti?.length || 0;
            return (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, background: C.deep, borderRadius: 8, padding: "8px 12px" }}>
                <span style={{ fontSize: 18 }}>{tipoInfo(boat?.tipo).icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.foam, fontSize: 13, fontWeight: 700 }}>{boat?.name} • {b.slot}</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>{new Date(b.date + "T12:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })} • ⚓ {pope?.name || "—"}{nPart > 0 ? ` +${nPart}` : ""}</div>
                </div>
                <button onClick={() => confirm(b.id)} style={{ ...S.btn, background: C.green, color: "#fff", padding: "4px 12px", fontSize: 11 }}>✓</button>
                <button onClick={() => cancel(b.id)} style={{ ...S.btn, background: C.red, color: "#fff", padding: "4px 12px", fontSize: 11 }}>✗</button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {all.map(b => {
          const boat = fleet.find(f => f.id === b.boatId);
          const pope = members.find(m => m.id === b.popeId);
          const partecipanti = (b.partecipanti || []).map(id => members.find(m => m.id === id)).filter(Boolean);
          return (
            <div key={b.id} style={{ ...S.card, border: `1px solid ${boat?.color || C.lagoon}33`, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 6, borderRadius: 3, alignSelf: "stretch", background: boat?.color || C.lagoon, flexShrink: 0 }} />
              <div style={{ fontSize: 20, paddingTop: 2 }}>{tipoInfo(boat?.tipo).icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.foam, fontWeight: 700, fontSize: 13 }}>{boat?.name || "Barca rimossa"}</div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                  {new Date(b.date + "T12:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })} • {b.slot}
                </div>
                {pope && <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>⚓ Pope: <span style={{ color: C.gold }}>{pope.name}</span></div>}
                {partecipanti.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4, alignItems: "center" }}>
                    {partecipanti.map(p => <RuoloBadge key={p.id} ruolo={p.ruolo} small />)}
                    <span style={{ color: C.muted, fontSize: 10 }}>{partecipanti.map(p => p.name.split(" ")[0]).join(", ")}</span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                <div style={{ color: b.confirmed ? C.green : C.gold, fontSize: 10, fontWeight: 700 }}>{b.confirmed ? "✓ Conf." : "⏳ Attesa"}</div>
                {!b.confirmed && <button onClick={() => cancel(b.id)} style={{ ...S.btn, background: `${C.red}22`, color: C.red, fontSize: 10, padding: "3px 8px" }}>Annulla</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [view, setView] = useState("calendario");
  const [fleet, setFleet] = useState(FLEET_INIT);
  const [members, setMembers] = useState(MEMBERS_INIT);
  const [bookings, setBookings] = useState(() => initBookings(FLEET_INIT, MEMBERS_INIT));

  const pending = Object.values(bookings).flat().filter(b => !b.confirmed).length;

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Lato:wght@300;400;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: C.water, fontFamily: "'Lato', sans-serif", color: C.foam }}>
      <NavBar view={view} setView={setView} notifications={pending} />
      {view === "calendario"   && <CalendarioView   bookings={bookings} setBookings={setBookings} fleet={fleet} members={members} />}
      {view === "flotta"       && <FlottaView       fleet={fleet} setFleet={setFleet} />}
      {view === "soci"         && <SociView         members={members} setMembers={setMembers} />}
      {view === "prenotazioni" && <PrenotazioniView bookings={bookings} setBookings={setBookings} fleet={fleet} members={members} />}
      <div style={{ textAlign: "center", padding: "20px 16px", color: `${C.muted}55`, fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>
        Remiera Gestionale • Voga Veneta • {new Date().getFullYear()}
      </div>
    </div>
  );
}
