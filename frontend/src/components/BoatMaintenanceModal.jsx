import { useEffect, useState } from "react";
import { maintenanceApi } from "../api/services";
import { S, colors, fonts, formatDate, formatEuro, todayStr } from "../styles/theme";
import Modal from "./Modal";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  date: todayStr(),
  description: "",
  cost: "",
  performed_by: "",
  next_check_date: "",
  create_finance_record: false,
};

export default function BoatMaintenanceModal({ boat, onClose }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await maintenanceApi.byBoat(boat.id);
      const data = (r.data || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setEntries(data);
      setError(null);
    } catch (e) {
      setError("Errore nel caricamento manutenzioni.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [boat.id]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    setForm({
      date: m.date?.slice(0, 10) || todayStr(),
      description: m.description || "",
      cost: String(m.cost ?? ""),
      performed_by: m.performed_by || "",
      next_check_date: m.next_check_date?.slice(0, 10) || "",
      create_finance_record: false,
    });
    setFormOpen(true);
  };

  const set = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      const payload = {
        boat_id: boat.id,
        date: form.date,
        description: form.description.trim(),
        cost: form.cost ? parseFloat(form.cost) : 0,
        performed_by: form.performed_by || null,
        next_check_date: form.next_check_date || null,
      };
      if (editing) {
        await maintenanceApi.update(editing.id, payload);
      } else {
        await maintenanceApi.create({
          ...payload,
          create_finance_record: !!form.create_finance_record,
        });
      }
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
      await maintenanceApi.remove(id);
      setConfirmDel(null);
      await load();
    } catch {
      alert("Errore nell'eliminazione");
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Modal title={`Manutenzioni ${boat.name}`} onClose={onClose} maxWidth={640}>
        {isAdmin && (
          <div style={{ marginBottom: 14 }}>
            <button onClick={openNew} style={{ ...S.btn, ...S.btnGold }}>
              + Aggiungi manutenzione
            </button>
          </div>
        )}

        {error && (
          <div
            style={{
              background: `${colors.red}22`,
              color: colors.red,
              border: `1px solid ${colors.red}55`,
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 12,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 24, color: colors.muted }}>Caricamento...</div>
        ) : entries.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 24,
              color: colors.muted,
              fontSize: 14,
              background: colors.panel,
              borderRadius: 10,
            }}
          >
            🛠 Nessuna manutenzione registrata
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {entries.map((m) => {
              const overdue =
                m.next_check_date && m.next_check_date.slice(0, 10) < today;
              const upcoming =
                m.next_check_date && m.next_check_date.slice(0, 10) >= today;
              return (
                <div
                  key={m.id}
                  style={{
                    ...S.card,
                    padding: 14,
                    borderLeft: `4px solid ${overdue ? colors.red : colors.lagoon}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: fonts.display,
                            fontSize: 15,
                            fontWeight: 700,
                            color: colors.foam,
                          }}
                        >
                          {formatDate(m.date)}
                        </span>
                        {m.cost > 0 && (
                          <span
                            style={{
                              ...S.badge,
                              background: `${colors.gold}22`,
                              color: colors.gold,
                            }}
                          >
                            {formatEuro(m.cost)}
                          </span>
                        )}
                        {m.finance_record_id && (
                          <span
                            style={{
                              ...S.badge,
                              background: `${colors.green}22`,
                              color: colors.green,
                            }}
                          >
                            💰 In Economia
                          </span>
                        )}
                      </div>
                      <div style={{ color: colors.foam, fontSize: 14, marginTop: 6 }}>
                        {m.description}
                      </div>
                      {m.performed_by && (
                        <div style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                          👤 {m.performed_by}
                        </div>
                      )}
                      {upcoming && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 12,
                            color: colors.lagoon,
                            fontWeight: 600,
                          }}
                        >
                          ⏰ Prossimo controllo: {formatDate(m.next_check_date)}
                        </div>
                      )}
                      {overdue && (
                        <div style={{ marginTop: 8 }}>
                          <span
                            style={{
                              ...S.badge,
                              background: `${colors.red}22`,
                              color: colors.red,
                              border: `1px solid ${colors.red}55`,
                            }}
                          >
                            ⚠ Controllo scaduto ({formatDate(m.next_check_date)})
                          </span>
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <button
                          onClick={() => openEdit(m)}
                          style={{
                            ...S.btnSmall,
                            background: `${colors.lagoon}22`,
                            color: colors.lagoon,
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setConfirmDel(m)}
                          style={{ ...S.btnSmall, ...S.btnRed }}
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Nested form modal */}
      {formOpen && (
        <Modal
          title={editing ? "Modifica manutenzione" : "Nuova manutenzione"}
          onClose={() => setFormOpen(false)}
          maxWidth={500}
        >
          <form onSubmit={submit}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Data *</label>
                <input
                  type="date"
                  style={S.input}
                  value={form.date}
                  onChange={set("date")}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Costo (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  style={S.input}
                  value={form.cost}
                  onChange={set("cost")}
                />
              </div>
            </div>

            <label style={{ ...S.label, marginTop: 14 }}>Descrizione *</label>
            <textarea
              style={{ ...S.input, minHeight: 70, resize: "vertical" }}
              value={form.description}
              onChange={set("description")}
              required
              placeholder="es. Sostituzione scalmi e verniciatura scafo"
            />

            <label style={{ ...S.label, marginTop: 14 }}>Eseguito da</label>
            <input
              style={S.input}
              value={form.performed_by}
              onChange={set("performed_by")}
              placeholder="es. Squero Tramontin"
            />

            <label style={{ ...S.label, marginTop: 14 }}>Prossimo controllo</label>
            <input
              type="date"
              style={S.input}
              value={form.next_check_date}
              onChange={set("next_check_date")}
            />

            {!editing && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 14,
                  color: colors.foam,
                  fontSize: 13,
                  cursor: "pointer",
                  padding: 10,
                  background: colors.panel,
                  borderRadius: 10,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.create_finance_record}
                  onChange={set("create_finance_record")}
                />
                <span>💰 Registra anche come uscita in Economia</span>
              </label>
            )}

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
                disabled={saving || !form.description.trim()}
                style={{
                  ...S.btn,
                  ...S.btnGold,
                  flex: 2,
                  opacity: saving || !form.description.trim() ? 0.5 : 1,
                }}
              >
                {saving ? "Salvataggio..." : editing ? "✓ Salva modifiche" : "✓ Aggiungi"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <Modal
          title="Conferma eliminazione"
          onClose={() => setConfirmDel(null)}
          maxWidth={360}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗑️</div>
            <div style={{ color: colors.foam, fontWeight: 700, marginBottom: 8 }}>
              Eliminare questa manutenzione?
            </div>
            <div style={{ color: colors.muted, fontSize: 12, marginBottom: 20 }}>
              {formatDate(confirmDel.date)} — {confirmDel.description}
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
    </>
  );
}
