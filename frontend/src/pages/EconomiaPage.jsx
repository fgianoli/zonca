import { useEffect, useMemo, useState } from "react";
import { financeApi, membersApi, exportsApi, downloadBlob } from "../api/services";
import { getErrorMessage } from "../api/client";
import { S, colors, fonts, formatDate, formatEuro, todayStr } from "../styles/theme";
import Modal from "../components/Modal";
import { useIsMobile } from "../hooks/useMediaQuery";

const CATEGORIES = {
  quota_sociale: "Quota sociale",
  donazione: "Donazione",
  contributo: "Contributo",
  manutenzione: "Manutenzione",
  materiali: "Materiali",
  affitto: "Affitto",
  assicurazione: "Assicurazione",
  evento: "Evento",
  altro: "Altro",
};

const emptyForm = {
  date: todayStr(),
  type: "entrata",
  amount: "",
  category: "altro",
  description: "",
  receipt_ref: "",
  member_id: "",
};

export default function EconomiaPage() {
  const isMobile = useIsMobile();
  const [records, setRecords] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    type: "",
    category: "",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.type) params.type = filters.type;
      if (filters.category) params.category = filters.category;
      const r = await financeApi.list(params);
      setRecords(r.data || []);
      setError(null);
    } catch {
      setError("Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    membersApi
      .list()
      .then((r) => setMembers(r.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [filters]);

  const totals = useMemo(() => {
    let entrate = 0;
    let uscite = 0;
    const byCategory = {};
    for (const r of records) {
      const a = Number(r.amount) || 0;
      if (r.type === "entrata") entrate += a;
      else uscite += a;
      const key = `${r.type}:${r.category}`;
      byCategory[key] = (byCategory[key] || 0) + a;
    }
    return { entrate, uscite, saldo: entrate - uscite, byCategory };
  }, [records]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (rec) => {
    setEditing(rec);
    setForm({
      date: rec.date?.slice(0, 10) || todayStr(),
      type: rec.type,
      amount: String(rec.amount ?? ""),
      category: rec.category || "altro",
      description: rec.description || "",
      receipt_ref: rec.receipt_ref || "",
      member_id: rec.member_id || "",
    });
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        type: form.type,
        amount: parseFloat(form.amount) || 0,
        category: form.category,
        description: form.description || null,
        receipt_ref: form.receipt_ref || null,
        member_id: form.member_id ? Number(form.member_id) : null,
      };
      if (editing) await financeApi.update(editing.id, payload);
      else await financeApi.create(payload);
      setModalOpen(false);
      await load();
    } catch {
      alert("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const del = async (rec) => {
    if (!window.confirm(`Eliminare la registrazione del ${formatDate(rec.date)}?`)) return;
    try {
      await financeApi.remove(rec.id);
      await load();
    } catch {
      alert("Errore nell'eliminazione");
    }
  };

  const sorted = [...records].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setFilter = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  const badge = (type) => (
    <span
      style={{
        ...S.badge,
        backgroundColor: (type === "entrata" ? colors.green : colors.red) + "33",
        color: type === "entrata" ? colors.green : colors.red,
      }}
    >
      {type}
    </span>
  );

  return (
    <div style={{ ...S.container, padding: isMobile ? "16px 12px" : "32px 24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "flex-end",
          flexDirection: isMobile ? "column" : "row",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ ...S.title, fontSize: isMobile ? 24 : 30 }}>Economia</h1>
          <p style={S.subtitle}>Registrazioni entrate e uscite</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
          <button
            style={{ ...S.btn, ...S.btnGhost, width: isMobile ? "100%" : "auto" }}
            onClick={async () => {
              try {
                const from = filters.date_from || "";
                const to = filters.date_to || "";
                const res = await exportsApi.finance(from, to);
                const label = from || to ? `${from || "inizio"}_${to || "oggi"}` : "tutti";
                downloadBlob(res, `movimenti_${label}.csv`);
              } catch (e) {
                alert(getErrorMessage(e, "Errore export"));
              }
            }}
          >
            📥 Esporta CSV
          </button>
          <button style={{ ...S.btn, ...S.btnGold, width: isMobile ? "100%" : "auto" }} onClick={openNew}>
            + Nuova registrazione
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: isMobile ? 8 : 16, margin: "24px 0", flexWrap: "wrap" }}>
        <div style={{ ...S.card, flex: 1, minWidth: 180, borderLeft: `4px solid ${colors.green}` }}>
          <div style={{ color: colors.muted, fontSize: 12, textTransform: "uppercase" }}>
            Entrate totali
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 26, color: colors.green, marginTop: 6 }}>
            {formatEuro(totals.entrate)}
          </div>
        </div>
        <div style={{ ...S.card, flex: 1, minWidth: 180, borderLeft: `4px solid ${colors.red}` }}>
          <div style={{ color: colors.muted, fontSize: 12, textTransform: "uppercase" }}>
            Uscite totali
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 26, color: colors.red, marginTop: 6 }}>
            {formatEuro(totals.uscite)}
          </div>
        </div>
        <div
          style={{
            ...S.card,
            flex: 1,
            minWidth: 180,
            borderLeft: `4px solid ${totals.saldo >= 0 ? colors.green : colors.red}`,
          }}
        >
          <div style={{ color: colors.muted, fontSize: 12, textTransform: "uppercase" }}>Saldo</div>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 26,
              color: totals.saldo >= 0 ? colors.green : colors.red,
              marginTop: 6,
            }}
          >
            {formatEuro(totals.saldo)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={S.label}>Da</label>
            <input type="date" style={S.input} value={filters.date_from} onChange={setFilter("date_from")} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={S.label}>A</label>
            <input type="date" style={S.input} value={filters.date_to} onChange={setFilter("date_to")} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={S.label}>Tipo</label>
            <select style={S.input} value={filters.type} onChange={setFilter("type")}>
              <option value="">Tutti</option>
              <option value="entrata">Entrata</option>
              <option value="uscita">Uscita</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={S.label}>Categoria</label>
            <select style={S.input} value={filters.category} onChange={setFilter("category")}>
              <option value="">Tutte</option>
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table / Card stack */}
      <div style={{ ...S.card, padding: isMobile ? 12 : 20 }}>
        {loading ? (
          <p style={{ color: colors.muted }}>Caricamento...</p>
        ) : error ? (
          <p style={{ color: colors.red }}>{error}</p>
        ) : sorted.length === 0 ? (
          <p style={{ color: colors.muted }}>Nessuna registrazione trovata.</p>
        ) : isMobile ? (
          <div style={{ display: "grid", gap: 10 }}>
            {sorted.map((r) => (
              <div
                key={r.id}
                style={{
                  border: `1px solid ${colors.borderSoft}`,
                  borderLeft: `4px solid ${r.type === "entrata" ? colors.green : colors.red}`,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {badge(r.type)}
                      <span style={{ color: colors.muted, fontSize: 12 }}>{formatDate(r.date)}</span>
                    </div>
                    <div
                      style={{
                        fontFamily: fonts.display,
                        fontSize: 20,
                        fontWeight: 700,
                        color: r.type === "entrata" ? colors.green : colors.red,
                        marginTop: 4,
                      }}
                    >
                      {formatEuro(r.amount)}
                    </div>
                    <div style={{ color: colors.foam, fontSize: 13, marginTop: 2 }}>
                      {CATEGORIES[r.category] || r.category}
                    </div>
                    {r.description && (
                      <div style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{r.description}</div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button
                    style={{ ...S.btnSmall, backgroundColor: colors.lagoon, color: "#fff", flex: 1 }}
                    onClick={() => openEdit(r)}
                  >
                    Modifica
                  </button>
                  <button style={{ ...S.btnSmall, ...S.btnRed, flex: 1 }} onClick={() => del(r)}>
                    Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: colors.muted, fontSize: 11, textTransform: "uppercase" }}>
                <th style={{ padding: "8px 6px", borderBottom: `1px solid ${colors.lagoon}33` }}>Data</th>
                <th style={{ padding: "8px 6px", borderBottom: `1px solid ${colors.lagoon}33` }}>Tipo</th>
                <th style={{ padding: "8px 6px", borderBottom: `1px solid ${colors.lagoon}33` }}>Importo</th>
                <th style={{ padding: "8px 6px", borderBottom: `1px solid ${colors.lagoon}33` }}>Categoria</th>
                <th style={{ padding: "8px 6px", borderBottom: `1px solid ${colors.lagoon}33` }}>Descrizione</th>
                <th style={{ padding: "8px 6px", borderBottom: `1px solid ${colors.lagoon}33` }}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} style={{ color: colors.foam }}>
                  <td style={{ padding: "10px 6px", borderBottom: `1px solid ${colors.lagoon}22` }}>
                    {formatDate(r.date)}
                  </td>
                  <td style={{ padding: "10px 6px", borderBottom: `1px solid ${colors.lagoon}22` }}>
                    {badge(r.type)}
                  </td>
                  <td
                    style={{
                      padding: "10px 6px",
                      borderBottom: `1px solid ${colors.lagoon}22`,
                      color: r.type === "entrata" ? colors.green : colors.red,
                      fontWeight: 700,
                    }}
                  >
                    {formatEuro(r.amount)}
                  </td>
                  <td style={{ padding: "10px 6px", borderBottom: `1px solid ${colors.lagoon}22` }}>
                    {CATEGORIES[r.category] || r.category}
                  </td>
                  <td
                    style={{
                      padding: "10px 6px",
                      borderBottom: `1px solid ${colors.lagoon}22`,
                      color: colors.muted,
                    }}
                  >
                    {r.description || "—"}
                  </td>
                  <td style={{ padding: "10px 6px", borderBottom: `1px solid ${colors.lagoon}22`, textAlign: "right" }}>
                    <button
                      style={{ ...S.btnSmall, backgroundColor: colors.lagoon, color: "#fff", marginRight: 6 }}
                      onClick={() => openEdit(r)}
                    >
                      Modifica
                    </button>
                    <button
                      style={{ ...S.btnSmall, ...S.btnRed }}
                      onClick={() => del(r)}
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Category breakdown */}
      {sorted.length > 0 && (
        <div style={{ ...S.card, marginTop: 20 }}>
          <h3 style={{ fontFamily: fonts.display, color: colors.gold, fontSize: 18, margin: "0 0 12px" }}>
            Riepilogo per categoria
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {Object.entries(totals.byCategory).map(([key, val]) => {
              const [type, cat] = key.split(":");
              return (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    backgroundColor: colors.water,
                    borderRadius: 6,
                  }}
                >
                  <span style={{ color: colors.muted, fontSize: 13 }}>
                    {badge(type)} {CATEGORIES[cat] || cat}
                  </span>
                  <span
                    style={{
                      color: type === "entrata" ? colors.green : colors.red,
                      fontWeight: 700,
                    }}
                  >
                    {formatEuro(val)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? "Modifica registrazione" : "Nuova registrazione"}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={submit}>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Data</label>
                <input type="date" style={S.input} value={form.date} onChange={set("date")} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Importo (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  style={S.input}
                  value={form.amount}
                  onChange={set("amount")}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Tipo</label>
              <div style={{ display: "flex", gap: 16, color: colors.foam }}>
                <label style={{ cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="type"
                    value="entrata"
                    checked={form.type === "entrata"}
                    onChange={set("type")}
                  />{" "}
                  Entrata
                </label>
                <label style={{ cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="type"
                    value="uscita"
                    checked={form.type === "uscita"}
                    onChange={set("type")}
                  />{" "}
                  Uscita
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Categoria</label>
              <select style={S.input} value={form.category} onChange={set("category")}>
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Descrizione</label>
              <input style={S.input} value={form.description} onChange={set("description")} />
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Riferimento ricevuta</label>
                <input style={S.input} value={form.receipt_ref} onChange={set("receipt_ref")} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Socio collegato (opz.)</label>
                <select style={S.input} value={form.member_id} onChange={set("member_id")}>
                  <option value="">—</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome} {m.cognome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
              <button type="button" style={{ ...S.btn, ...S.btnGhost }} onClick={() => setModalOpen(false)}>
                Annulla
              </button>
              <button
                type="submit"
                style={{ ...S.btn, ...S.btnGold, opacity: saving ? 0.5 : 1 }}
                disabled={saving}
              >
                {saving ? "Salvataggio..." : "Salva"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
