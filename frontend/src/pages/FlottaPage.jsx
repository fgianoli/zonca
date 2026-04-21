import { useState, useEffect } from "react";
import { boatsApi } from "../api/services";
import { colors, fonts, S, TIPI_BARCA, formatDate } from "../styles/theme";
import Modal from "../components/Modal";
import BoatMaintenanceModal from "../components/BoatMaintenanceModal";
import { useAuth } from "../context/AuthContext";

const BOAT_COLORS = [
  "#c0392b",
  "#2980b9",
  "#8e44ad",
  "#16a085",
  "#c8963e",
  "#2d7d9a",
  "#d35400",
  "#27ae60",
  "#1a3a4a",
  "#7f8c8d",
];

const STATUS_INFO = {
  attiva: { label: "Attiva", color: colors.green, dot: "●" },
  manutenzione: { label: "Manutenzione", color: colors.orange, dot: "●" },
  fuori_servizio: { label: "Fuori servizio", color: colors.red, dot: "●" },
};

const EMPTY_BOAT = {
  name: "",
  tipo: "mascareta",
  seats: 1,
  color: BOAT_COLORS[0],
  status: "attiva",
  maintenance_reason: "",
  maintenance_until: "",
  note: "",
};

export default function FlottaPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [boats, setBoats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_BOAT);
  const [confirmDel, setConfirmDel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [maintenanceBoat, setMaintenanceBoat] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await boatsApi.list();
      setBoats(res.data || []);
      setError(null);
    } catch (e) {
      setError("Errore nel caricamento della flotta.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setForm(EMPTY_BOAT);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (b) => {
    setForm({
      name: b.name || "",
      tipo: b.tipo || "mascareta",
      seats: b.seats || 1,
      color: b.color || BOAT_COLORS[0],
      status: b.status || "attiva",
      maintenance_reason: b.maintenance_reason || "",
      maintenance_until: b.maintenance_until || "",
      note: b.note || "",
    });
    setEditingId(b.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        tipo: form.tipo,
        seats: parseInt(form.seats) || 1,
        color: form.color,
        status: form.status,
        maintenance_reason:
          form.status === "manutenzione" ? form.maintenance_reason : null,
        maintenance_until:
          form.status === "manutenzione" && form.maintenance_until
            ? form.maintenance_until
            : null,
        note: form.note,
      };
      if (editingId) {
        await boatsApi.update(editingId, payload);
      } else {
        await boatsApi.create(payload);
      }
      await load();
      setShowForm(false);
    } catch (e) {
      setError("Errore nel salvataggio.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    try {
      await boatsApi.remove(id);
      await load();
      setConfirmDel(null);
    } catch (e) {
      setError("Errore nell'eliminazione.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (boat, status) => {
    try {
      await boatsApi.update(boat.id, { status });
      await load();
    } catch (e) {
      setError("Errore nel cambio stato.");
    }
  };

  // Group by tipo
  const byTipo = Object.entries(TIPI_BARCA)
    .map(([value, info]) => ({
      value,
      ...info,
      boats: boats.filter((b) => b.tipo === value),
    }))
    .filter((t) => t.boats.length > 0);

  const countByStatus = {
    attiva: boats.filter((b) => b.status === "attiva").length,
    manutenzione: boats.filter((b) => b.status === "manutenzione").length,
    fuori_servizio: boats.filter((b) => b.status === "fuori_servizio").length,
  };

  return (
    <div style={S.container}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={S.title}>Flotta</h1>
          <p style={S.subtitle}>
            {boats.length} imbarcazioni • {countByStatus.attiva} attive •{" "}
            {countByStatus.manutenzione} in manutenzione •{" "}
            {countByStatus.fuori_servizio} fuori servizio
          </p>
        </div>
        {isAdmin && (
          <button onClick={openAdd} style={S.btn}>
            + Aggiungi barca
          </button>
        )}
      </div>

      {/* Status summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
          marginTop: 16,
        }}
      >
        {Object.entries(STATUS_INFO).map(([key, info]) => (
          <div
            key={key}
            style={{
              ...S.card,
              padding: "12px 14px",
              borderLeft: `4px solid ${info.color}`,
            }}
          >
            <div
              style={{
                color: info.color,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1,
                fontWeight: 700,
              }}
            >
              {info.dot} {info.label}
            </div>
            <div
              style={{
                color: colors.foam,
                fontSize: 22,
                fontFamily: fonts.display,
                fontWeight: 700,
              }}
            >
              {countByStatus[key] || 0}
            </div>
          </div>
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
      ) : boats.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: colors.muted,
            padding: 40,
            fontSize: 14,
            marginTop: 20,
          }}
        >
          Nessuna barca in flotta.
          {isAdmin && " Clicca su “+ Aggiungi barca” per iniziare."}
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          {byTipo.map((t) => (
            <div key={t.value} style={{ marginBottom: 28 }}>
              <div
                style={{
                  color: colors.foam,
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  borderBottom: `1px solid ${colors.lagoon}33`,
                  paddingBottom: 8,
                  marginBottom: 12,
                }}
              >
                {t.icon} {t.label}{" "}
                <span
                  style={{
                    color: colors.muted,
                    fontWeight: 400,
                    letterSpacing: 0,
                    fontSize: 11,
                    marginLeft: 6,
                  }}
                >
                  ({t.boats.length})
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 14,
                }}
              >
                {t.boats.map((b) => {
                  const info = STATUS_INFO[b.status] || STATUS_INFO.attiva;
                  return (
                    <div
                      key={b.id}
                      style={{
                        ...S.card,
                        padding: 16,
                        border: `1px solid ${
                          b.status === "attiva" ? b.color : colors.muted
                        }44`,
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          ...S.badge,
                          background: `${info.color}22`,
                          color: info.color,
                          border: `1px solid ${info.color}55`,
                        }}
                      >
                        {info.dot} {info.label}
                      </div>

                      <div style={{ fontSize: 28, marginBottom: 6 }}>
                        {t.icon}
                      </div>
                      <div
                        style={{
                          color: colors.foam,
                          fontWeight: 700,
                          fontSize: 15,
                          paddingRight: 110,
                        }}
                      >
                        {b.name}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 6,
                        }}
                      >
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 3,
                            background: b.color,
                            border: "1px solid #fff3",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: colors.muted, fontSize: 12 }}>
                          {b.seats} {b.seats === 1 ? "posto" : "posti"}
                        </span>
                      </div>

                      {b.status === "manutenzione" && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: "6px 8px",
                            background: `${colors.orange}15`,
                            border: `1px solid ${colors.orange}44`,
                            borderRadius: 6,
                            fontSize: 11,
                            color: colors.foam,
                          }}
                        >
                          {b.maintenance_reason && (
                            <div>
                              <strong style={{ color: colors.orange }}>
                                Motivo:
                              </strong>{" "}
                              {b.maintenance_reason}
                            </div>
                          )}
                          {b.maintenance_until && (
                            <div style={{ marginTop: 2 }}>
                              <strong style={{ color: colors.orange }}>
                                Fino al:
                              </strong>{" "}
                              {formatDate(b.maintenance_until)}
                            </div>
                          )}
                        </div>
                      )}

                      {b.note && (
                        <div
                          style={{
                            color: colors.muted,
                            fontSize: 11,
                            marginTop: 8,
                            fontStyle: "italic",
                          }}
                        >
                          {b.note}
                        </div>
                      )}

                      <button
                        onClick={() => setMaintenanceBoat(b)}
                        style={{
                          ...S.btnSmall,
                          marginTop: 10,
                          width: "100%",
                          background: `${colors.gold}15`,
                          color: colors.gold,
                          border: `1px solid ${colors.gold}44`,
                        }}
                      >
                        🔧 Manutenzioni
                      </button>

                      {isAdmin && (
                        <>
                          <label
                            style={{ ...S.label, marginTop: 12, fontSize: 10 }}
                          >
                            Stato rapido
                          </label>
                          <select
                            value={b.status}
                            onChange={(e) =>
                              handleStatusChange(b, e.target.value)
                            }
                            style={{
                              ...S.input,
                              padding: "6px 10px",
                              fontSize: 12,
                            }}
                          >
                            <option value="attiva">Attiva</option>
                            <option value="manutenzione">Manutenzione</option>
                            <option value="fuori_servizio">
                              Fuori servizio
                            </option>
                          </select>

                          <div
                            style={{ display: "flex", gap: 6, marginTop: 10 }}
                          >
                            <button
                              onClick={() => openEdit(b)}
                              style={{
                                ...S.btnSmall,
                                flex: 1,
                                backgroundColor: `${colors.lagoon}33`,
                                color: colors.foam,
                              }}
                            >
                              ✏️ Modifica
                            </button>
                            <button
                              onClick={() => setConfirmDel(b.id)}
                              style={{
                                ...S.btnSmall,
                                backgroundColor: `${colors.red}22`,
                                color: colors.red,
                              }}
                            >
                              🗑
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <Modal
          title={editingId ? "Modifica barca" : "Nuova imbarcazione"}
          onClose={() => setShowForm(false)}
          maxWidth={460}
        >
          <label style={S.label}>Nome barca</label>
          <input
            value={form.name}
            onChange={(e) =>
              setForm((f) => ({ ...f, name: e.target.value }))
            }
            placeholder="es. La Dogalessa"
            style={S.input}
          />

          <label style={{ ...S.label, marginTop: 14 }}>Tipo</label>
          <select
            value={form.tipo}
            onChange={(e) => {
              const info = TIPI_BARCA[e.target.value];
              setForm((f) => ({
                ...f,
                tipo: e.target.value,
                seats: info?.seats || 1,
              }));
            }}
            style={S.input}
          >
            {Object.entries(TIPI_BARCA).map(([k, v]) => (
              <option key={k} value={k}>
                {v.icon} {v.label}
              </option>
            ))}
          </select>

          <label style={{ ...S.label, marginTop: 14 }}>Posti vogatori</label>
          <input
            type="number"
            min={1}
            max={20}
            value={form.seats}
            onChange={(e) =>
              setForm((f) => ({ ...f, seats: e.target.value }))
            }
            style={S.input}
          />

          <label style={{ ...S.label, marginTop: 14 }}>
            Colore identificativo
          </label>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 4,
            }}
          >
            {BOAT_COLORS.map((c) => (
              <div
                key={c}
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  background: c,
                  cursor: "pointer",
                  border:
                    form.color === c
                      ? "3px solid #fff"
                      : "2px solid transparent",
                  transition: "border 0.15s",
                }}
              />
            ))}
          </div>

          <label style={{ ...S.label, marginTop: 14 }}>Stato</label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({ ...f, status: e.target.value }))
            }
            style={S.input}
          >
            <option value="attiva">Attiva</option>
            <option value="manutenzione">Manutenzione</option>
            <option value="fuori_servizio">Fuori servizio</option>
          </select>

          {form.status === "manutenzione" && (
            <>
              <label style={{ ...S.label, marginTop: 14 }}>
                Motivo manutenzione
              </label>
              <input
                value={form.maintenance_reason}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    maintenance_reason: e.target.value,
                  }))
                }
                placeholder="es. Revisione annuale"
                style={S.input}
              />

              <label style={{ ...S.label, marginTop: 14 }}>Rientro entro</label>
              <input
                type="date"
                value={form.maintenance_until || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    maintenance_until: e.target.value,
                  }))
                }
                style={S.input}
              />
            </>
          )}

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
              onClick={() => setShowForm(false)}
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
              onClick={handleSave}
              disabled={!form.name.trim() || saving}
              style={{
                ...S.btn,
                flex: 2,
                opacity: !form.name.trim() || saving ? 0.6 : 1,
              }}
            >
              {saving
                ? "Salvataggio..."
                : editingId
                ? "✓ Salva modifiche"
                : "✓ Aggiungi"}
            </button>
          </div>
        </Modal>
      )}

      {/* Maintenance modal */}
      {maintenanceBoat && (
        <BoatMaintenanceModal
          boat={maintenanceBoat}
          onClose={() => setMaintenanceBoat(null)}
        />
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <Modal
          title="Conferma eliminazione"
          onClose={() => setConfirmDel(null)}
          maxWidth={340}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗑️</div>
            <div
              style={{
                color: colors.foam,
                fontWeight: 700,
                marginBottom: 8,
                fontSize: 15,
              }}
            >
              Eliminare {boats.find((b) => b.id === confirmDel)?.name}?
            </div>
            <div
              style={{
                color: colors.muted,
                fontSize: 12,
                marginBottom: 20,
              }}
            >
              Questa azione non può essere annullata.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmDel(null)}
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
                onClick={() => handleDelete(confirmDel)}
                disabled={saving}
                style={{
                  ...S.btn,
                  flex: 1,
                  backgroundColor: colors.red,
                  color: "#fff",
                }}
              >
                {saving ? "..." : "Elimina"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
