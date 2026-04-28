import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { crewsApi, membersApi } from "../api/services";
import { getErrorMessage } from "../api/client";
import Modal from "../components/Modal";
import { S, colors, fonts, SLOTS, RUOLI } from "../styles/theme";
import { useIsMobile } from "../hooks/useMediaQuery";

const EMPTY = {
  name: "",
  description: "",
  default_slot: "",
  pope_id: null,
  member_ids: [],
};

function Banner({ kind = "ok", children }) {
  const color = kind === "ok" ? colors.green : colors.red;
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        background: `${color}15`,
        color,
        border: `1px solid ${color}44`,
        fontSize: 13,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

export default function EquipaggiPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isMobile = useIsMobile();

  const [crews, setCrews] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, m] = await Promise.all([crewsApi.list(), membersApi.list()]);
      setCrews(c.data);
      setMembers(m.data);
      setError("");
    } catch (e) {
      setError(getErrorMessage(e, "Errore caricamento"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const membersById = useMemo(() => {
    const map = {};
    members.forEach((m) => (map[m.id] = m));
    return map;
  }, [members]);

  const handleDelete = async (crew) => {
    if (!window.confirm(`Eliminare l'equipaggio "${crew.name}"?`)) return;
    try {
      await crewsApi.remove(crew.id);
      load();
    } catch (e) {
      alert(getErrorMessage(e, "Errore eliminazione"));
    }
  };

  return (
    <div style={{ ...S.container, padding: isMobile ? "16px 12px" : "32px 24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "flex-end",
          marginBottom: 20,
          gap: 10,
          flexDirection: isMobile ? "column" : "row",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ ...S.title, fontSize: isMobile ? 24 : 30 }}>Equipaggi</h1>
          <div style={S.subtitle}>
            {crews.length} equipaggi • gruppi fissi con pope e vogatori
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setCreating(true)}
            style={{ ...S.btn, ...S.btnGold, color: colors.deep, width: isMobile ? "100%" : "auto" }}
          >
            + Nuovo equipaggio
          </button>
        )}
      </div>

      {error && <Banner kind="err">{error}</Banner>}

      {loading ? (
        <div style={{ color: colors.muted }}>Caricamento…</div>
      ) : crews.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", color: colors.muted }}>
          Nessun equipaggio registrato.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 14,
          }}
        >
          {crews.map((c) => (
            <CrewCard
              key={c.id}
              crew={c}
              membersById={membersById}
              onClick={() => setDetail(c)}
              isAdmin={isAdmin}
              onEdit={() => setEditing(c)}
              onDelete={() => handleDelete(c)}
            />
          ))}
        </div>
      )}

      {creating && (
        <CrewFormModal
          title="Nuovo equipaggio"
          initial={EMPTY}
          members={members}
          onClose={() => setCreating(false)}
          onSave={async (form) => {
            await crewsApi.create(form);
            setCreating(false);
            load();
          }}
        />
      )}

      {editing && (
        <CrewFormModal
          title="Modifica equipaggio"
          initial={{
            name: editing.name || "",
            description: editing.description || "",
            default_slot: editing.default_slot || "",
            pope_id: editing.pope_id || null,
            member_ids: (editing.members || []).map((m) => m.id),
          }}
          members={members}
          onClose={() => setEditing(null)}
          onSave={async (form) => {
            await crewsApi.update(editing.id, form);
            setEditing(null);
            load();
          }}
        />
      )}

      {detail && (
        <CrewDetailModal
          crew={detail}
          membersById={membersById}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function CrewCard({ crew, membersById, onClick, isAdmin, onEdit, onDelete }) {
  const pope = crew.pope_id ? membersById[crew.pope_id] : null;
  const members = crew.members || [];
  return (
    <div
      onClick={onClick}
      style={{
        ...S.cardElevated,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "transform .15s ease, box-shadow .15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h3
          style={{
            fontFamily: fonts.display,
            color: colors.foam,
            fontSize: 20,
            margin: 0,
            fontWeight: 700,
            flex: 1,
            minWidth: 0,
          }}
        >
          {crew.name}
        </h3>
        {crew.default_slot && (
          <span
            style={{
              ...S.badge,
              background: `${colors.lagoon}15`,
              color: colors.lagoon,
              border: `1px solid ${colors.lagoon}44`,
            }}
          >
            🕐 {crew.default_slot}
          </span>
        )}
      </div>

      {crew.description && (
        <div style={{ color: colors.muted, fontSize: 13 }}>{crew.description}</div>
      )}

      {pope && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 10,
            background: `${colors.gold}10`,
            border: `1px solid ${colors.gold}33`,
          }}
        >
          <span style={{ fontSize: 18 }}>⚓</span>
          <div>
            <div style={{ fontSize: 11, color: colors.muted, textTransform: "uppercase" }}>
              Pope
            </div>
            <div style={{ color: colors.foam, fontWeight: 700, fontSize: 13 }}>
              {pope.name}
            </div>
          </div>
        </div>
      )}

      <div>
        <div
          style={{
            fontSize: 11,
            color: colors.muted,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          👥 {members.length} membri
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {members.slice(0, 6).map((m) => {
            const r = RUOLI[m.ruolo] || RUOLI.ospite;
            return (
              <span
                key={m.id}
                title={m.name}
                style={{
                  ...S.badge,
                  background: `${r.color}15`,
                  color: r.color,
                  border: `1px solid ${r.color}44`,
                  fontSize: 11,
                }}
              >
                {r.icon} {m.name.split(" ")[0]}
              </span>
            );
          })}
          {members.length > 6 && (
            <span style={{ ...S.badge, background: colors.borderSoft, color: colors.muted }}>
              +{members.length - 6}
            </span>
          )}
        </div>
      </div>

      {isAdmin && (
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            style={{ ...S.btnSmall, background: `${colors.lagoon}22`, color: colors.lagoon }}
          >
            Modifica
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{ ...S.btnSmall, ...S.btnRed }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function CrewDetailModal({ crew, membersById, onClose }) {
  const pope = crew.pope_id ? membersById[crew.pope_id] : null;
  const members = crew.members || [];
  return (
    <Modal title={crew.name} onClose={onClose} maxWidth={640}>
      {crew.description && (
        <p style={{ color: colors.muted, fontSize: 14, marginTop: 0 }}>{crew.description}</p>
      )}
      <div style={{ display: "grid", gap: 14 }}>
        {crew.default_slot && (
          <div>
            <div style={S.label}>Orario preferito</div>
            <span
              style={{
                ...S.badge,
                background: `${colors.lagoon}22`,
                color: colors.lagoon,
                fontSize: 14,
                padding: "6px 14px",
              }}
            >
              🕐 {crew.default_slot}
            </span>
          </div>
        )}
        {pope && (
          <div>
            <div style={S.label}>⚓ Pope</div>
            <div
              style={{
                ...S.card,
                padding: 12,
                borderColor: `${colors.gold}55`,
                background: `${colors.gold}08`,
              }}
            >
              <div style={{ color: colors.foam, fontWeight: 700 }}>{pope.name}</div>
              {pope.email && (
                <div style={{ color: colors.muted, fontSize: 12 }}>✉ {pope.email}</div>
              )}
            </div>
          </div>
        )}
        <div>
          <div style={S.label}>Membri ({members.length})</div>
          {members.length === 0 ? (
            <div style={{ color: colors.muted, fontStyle: "italic" }}>Nessun membro.</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {members.map((m) => {
                const r = RUOLI[m.ruolo] || RUOLI.ospite;
                return (
                  <div
                    key={m.id}
                    style={{
                      ...S.card,
                      padding: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: `${r.color}22`,
                        border: `2px solid ${r.color}66`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                      }}
                    >
                      {r.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: colors.foam, fontWeight: 600, fontSize: 14 }}>
                        {m.name}
                      </div>
                      <div style={{ color: colors.muted, fontSize: 11 }}>{r.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function CrewFormModal({ title, initial, members, onClose, onSave }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const toggleMember = (id) => {
    setForm((f) =>
      f.member_ids.includes(id)
        ? { ...f, member_ids: f.member_ids.filter((x) => x !== id) }
        : { ...f, member_ids: [...f.member_ids, id] }
    );
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setErr("Nome obbligatorio");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await onSave({
        ...form,
        pope_id: form.pope_id || null,
        default_slot: form.default_slot || null,
      });
    } catch (e) {
      setErr(getErrorMessage(e, "Errore salvataggio"));
    } finally {
      setSaving(false);
    }
  };

  // pope candidates: all active members
  const activeMembers = members.filter((m) => m.is_active !== false);

  return (
    <Modal title={title} onClose={onClose} maxWidth={680}>
      {err && <Banner kind="err">{err}</Banner>}
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={S.label}>Nome equipaggio *</label>
          <input
            style={S.input}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label style={S.label}>Descrizione</label>
          <textarea
            style={{ ...S.input, minHeight: 60, resize: "vertical", fontFamily: fonts.body }}
            value={form.description || ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={S.label}>Orario preferito</label>
            <select
              style={S.input}
              value={form.default_slot || ""}
              onChange={(e) => setForm((f) => ({ ...f, default_slot: e.target.value }))}
            >
              <option value="">—</option>
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={S.label}>⚓ Pope</label>
            <select
              style={S.input}
              value={form.pope_id || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, pope_id: e.target.value ? Number(e.target.value) : null }))
              }
            >
              <option value="">— nessuno —</option>
              {activeMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label style={S.label}>Membri equipaggio ({form.member_ids.length})</label>
          <div
            style={{
              maxHeight: 220,
              overflowY: "auto",
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              padding: 8,
              display: "grid",
              gap: 4,
            }}
          >
            {activeMembers.map((m) => {
              const checked = form.member_ids.includes(m.id);
              const r = RUOLI[m.ruolo] || RUOLI.ospite;
              return (
                <label
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 8px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: checked ? `${colors.lagoon}10` : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMember(m.id)}
                  />
                  <span style={{ fontSize: 14 }}>{r.icon}</span>
                  <span style={{ color: colors.foam, fontSize: 13 }}>{m.name}</span>
                  <span style={{ color: colors.muted, fontSize: 11, marginLeft: "auto" }}>
                    {r.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={onClose} style={{ ...S.btn, ...S.btnGhost, flex: 1 }}>
          Annulla
        </button>
        <button onClick={submit} disabled={saving} style={{ ...S.btn, flex: 2 }}>
          {saving ? "Salvataggio…" : "Salva"}
        </button>
      </div>
    </Modal>
  );
}
