import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { usersApi, membersApi } from "../api/services";
import Modal from "../components/Modal";
import { colors, fonts, S, formatDate } from "../styles/theme";

const ROLES = [
  { value: "admin", label: "Admin", desc: "Accesso completo", color: colors.red },
  { value: "pope", label: "Pope", desc: "Conferma uscite e presenze", color: colors.gold },
  { value: "socio", label: "Socio", desc: "Prenotazioni personali", color: colors.lagoon },
];

function roleInfo(role) {
  return ROLES.find((r) => r.value === role) || ROLES[2];
}

export default function UtentiPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState(null); // { kind, text }
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [resetResult, setResetResult] = useState(null); // { email, password }

  const load = async () => {
    setLoading(true);
    try {
      const [u, m] = await Promise.all([usersApi.list(), membersApi.list({ active_only: false })]);
      setUsers(u.data);
      setMembers(m.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Errore caricamento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (text, kind = "ok") => {
    setMsg({ text, kind });
    if (kind === "ok") setTimeout(() => setMsg(null), 3500);
  };

  const counts = useMemo(() => {
    const c = { all: users.length };
    ROLES.forEach((r) => {
      c[r.value] = users.filter((u) => u.role === r.value).length;
    });
    return c;
  }, [users]);

  const filtered = useMemo(() => {
    let list = users;
    if (filter !== "all") list = list.filter((u) => u.role === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((u) => u.email.toLowerCase().includes(q));
    }
    return list;
  }, [users, filter, query]);

  const memberById = useMemo(() => {
    const map = new Map();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const toggleActive = async (u) => {
    try {
      await usersApi.update(u.id, { is_active: !u.is_active });
      await load();
      flash(u.is_active ? "Utente disattivato" : "Utente riattivato");
    } catch (e) {
      flash(e.response?.data?.detail || "Errore", "err");
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Eliminare definitivamente l'utente ${u.email}?\n(Il socio collegato rimane)`)) return;
    try {
      await usersApi.remove(u.id);
      await load();
      flash("Utente eliminato");
    } catch (e) {
      flash(e.response?.data?.detail || "Errore eliminazione", "err");
    }
  };

  return (
    <div style={S.container}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={S.title}>
            Gestione <span style={{ color: colors.lagoon }}>Utenti</span>
          </h1>
          <p style={S.subtitle}>
            {users.length} account · accesso al gestionale
          </p>
        </div>
        <button onClick={() => setCreating(true)} style={S.btn}>
          + Nuovo utente
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 18,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {[{ value: "all", label: "Tutti" }, ...ROLES].map((r) => {
          const active = filter === r.value;
          return (
            <button
              key={r.value}
              onClick={() => setFilter(r.value)}
              style={{
                ...S.btnSmall,
                background: active ? colors.gradLagoon : "transparent",
                color: active ? "#fff" : colors.muted,
                border: `1.5px solid ${active ? "transparent" : colors.border}`,
                padding: "7px 14px",
                boxShadow: active ? colors.shadowLagoon : "none",
              }}
            >
              {r.label} <span style={{ opacity: 0.8 }}>({counts[r.value] || 0})</span>
            </button>
          );
        })}
        <div style={{ flex: 1, minWidth: 160 }}>
          <input
            placeholder="🔍 Cerca per email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ ...S.input, padding: "9px 14px" }}
          />
        </div>
      </div>

      {error && (
        <div
          style={{
            ...S.card,
            borderColor: colors.red,
            color: colors.red,
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}
      {msg && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: msg.kind === "ok" ? `${colors.green}15` : `${colors.red}15`,
            color: msg.kind === "ok" ? colors.green : colors.red,
            border: `1px solid ${msg.kind === "ok" ? colors.green : colors.red}44`,
            fontSize: 13,
            marginBottom: 14,
            fontWeight: 500,
          }}
        >
          {msg.text}
        </div>
      )}

      {loading ? (
        <div style={{ color: colors.muted, padding: 40, textAlign: "center" }}>
          Caricamento…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", color: colors.muted }}>
          Nessun utente trovato.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((u) => {
            const info = roleInfo(u.role);
            const member = u.member_id ? memberById.get(u.member_id) : null;
            const isSelf = u.id === currentUser?.id;
            return (
              <div
                key={u.id}
                style={{
                  ...S.card,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  opacity: u.is_active ? 1 : 0.55,
                  borderLeft: `4px solid ${info.color}`,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: `${info.color}18`,
                    color: info.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {u.email[0].toUpperCase()}
                </div>
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
                        color: colors.foam,
                        fontWeight: 600,
                        fontSize: 15,
                      }}
                    >
                      {u.email}
                    </span>
                    {isSelf && (
                      <span
                        style={{
                          ...S.badge,
                          background: `${colors.lagoon}18`,
                          color: colors.lagoon,
                        }}
                      >
                        TU
                      </span>
                    )}
                    {!u.is_active && (
                      <span
                        style={{
                          ...S.badge,
                          background: `${colors.red}18`,
                          color: colors.red,
                        }}
                      >
                        DISATTIVATO
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      color: colors.muted,
                      fontSize: 12,
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      Creato: {formatDate(u.created_at)}
                    </span>
                    {member && (
                      <span>
                        Socio: <strong style={{ color: colors.foam }}>{member.name}</strong>
                      </span>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    ...S.badge,
                    background: `${info.color}18`,
                    color: info.color,
                    border: `1px solid ${info.color}44`,
                  }}
                >
                  {info.label}
                </span>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => setEditing(u)}
                    title="Modifica"
                    style={{ ...S.btnSmall, ...S.btnGhost }}
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() => setResetting(u)}
                    title="Reset password"
                    style={{ ...S.btnSmall, background: `${colors.gold}18`, color: colors.gold }}
                  >
                    🔑 Reset
                  </button>
                  {!isSelf && (
                    <>
                      <button
                        onClick={() => toggleActive(u)}
                        title={u.is_active ? "Disattiva" : "Riattiva"}
                        style={{
                          ...S.btnSmall,
                          background: u.is_active
                            ? `${colors.orange}18`
                            : `${colors.green}18`,
                          color: u.is_active ? colors.orange : colors.green,
                        }}
                      >
                        {u.is_active ? "Disattiva" : "Attiva"}
                      </button>
                      <button
                        onClick={() => remove(u)}
                        title="Elimina"
                        style={{ ...S.btnSmall, ...S.btnRed }}
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create user */}
      {creating && (
        <UserFormModal
          title="Nuovo utente"
          members={members}
          onClose={() => setCreating(false)}
          onSave={async (form) => {
            await usersApi.create(form);
            setCreating(false);
            await load();
            flash("Utente creato");
          }}
        />
      )}

      {/* Edit user */}
      {editing && (
        <UserFormModal
          title={`Modifica ${editing.email}`}
          initial={editing}
          editMode
          members={members}
          onClose={() => setEditing(null)}
          onSave={async (form) => {
            // Rimuovo campi non modificabili
            const { email, password, ...rest } = form;
            await usersApi.update(editing.id, rest);
            setEditing(null);
            await load();
            flash("Utente aggiornato");
          }}
        />
      )}

      {/* Reset password */}
      {resetting && (
        <ResetPasswordModal
          user={resetting}
          onClose={() => {
            setResetting(null);
            setResetResult(null);
          }}
          onDone={(result) => {
            setResetResult(result);
          }}
          result={resetResult}
        />
      )}
    </div>
  );
}

// ── User form ────────────────────────────────────────
function UserFormModal({ title, initial, editMode, members, onClose, onSave }) {
  const [form, setForm] = useState({
    email: initial?.email || "",
    password: "",
    role: initial?.role || "socio",
    member_id: initial?.member_id ?? null,
    is_active: initial?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setErr("");
    if (!editMode) {
      if (!form.email.trim() || !form.password.trim()) {
        setErr("Email e password obbligatorie");
        return;
      }
      if (form.password.length < 6) {
        setErr("Password minimo 6 caratteri");
        return;
      }
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        member_id: form.member_id || null,
      });
    } catch (e) {
      setErr(e.response?.data?.detail || "Errore");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      {err && (
        <div
          style={{
            padding: 10,
            background: `${colors.red}15`,
            color: colors.red,
            border: `1px solid ${colors.red}44`,
            borderRadius: 8,
            marginBottom: 14,
            fontSize: 13,
          }}
        >
          {err}
        </div>
      )}
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <label style={S.label}>Email</label>
          <input
            type="email"
            style={S.input}
            value={form.email}
            onChange={set("email")}
            disabled={editMode}
            placeholder="utente@esempio.it"
          />
          {editMode && (
            <div style={{ color: colors.faint, fontSize: 11, marginTop: 4 }}>
              L'email non è modificabile
            </div>
          )}
        </div>

        {!editMode && (
          <div>
            <label style={S.label}>Password iniziale</label>
            <input
              type="text"
              style={S.input}
              value={form.password}
              onChange={set("password")}
              placeholder="min. 6 caratteri"
            />
            <div style={{ color: colors.faint, fontSize: 11, marginTop: 4 }}>
              L'utente potrà cambiarla dopo il login
            </div>
          </div>
        )}

        <div>
          <label style={S.label}>Ruolo</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
            }}
          >
            {ROLES.map((r) => {
              const active = form.role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                  style={{
                    ...S.btnSmall,
                    padding: "12px 10px",
                    background: active ? `${r.color}18` : "transparent",
                    border: `2px solid ${active ? r.color : colors.border}`,
                    color: active ? r.color : colors.muted,
                    textAlign: "left",
                    boxShadow: "none",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{r.label}</div>
                  <div style={{ fontSize: 10, marginTop: 2, opacity: 0.85 }}>
                    {r.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label style={S.label}>Socio collegato (facoltativo)</label>
          <select
            style={S.input}
            value={form.member_id || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                member_id: e.target.value ? Number(e.target.value) : null,
              }))
            }
          >
            <option value="">— nessuno —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.tessera ? `(${m.tessera})` : ""}
              </option>
            ))}
          </select>
          <div style={{ color: colors.faint, fontSize: 11, marginTop: 4 }}>
            Collegare un socio permette all'utente di vedere le proprie prenotazioni e documenti
          </div>
        </div>

        {editMode && (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: colors.foam,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_active: e.target.checked }))
              }
            />
            Utente attivo
          </label>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <button onClick={onClose} style={{ ...S.btn, ...S.btnGhost, flex: 1 }}>
          Annulla
        </button>
        <button onClick={submit} disabled={saving} style={{ ...S.btn, flex: 2 }}>
          {saving ? "Salvataggio…" : editMode ? "Salva modifiche" : "Crea utente"}
        </button>
      </div>
    </Modal>
  );
}

// ── Reset password ───────────────────────────────────
function ResetPasswordModal({ user, onClose, onDone, result }) {
  const [mode, setMode] = useState("auto"); // auto | manual
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const reset = async () => {
    setErr("");
    if (mode === "manual") {
      if (!password || password.length < 6) {
        setErr("Password minimo 6 caratteri");
        return;
      }
    }
    setBusy(true);
    try {
      const { data } = await usersApi.resetPassword(
        user.id,
        mode === "manual" ? password : null
      );
      onDone({ email: user.email, password: data.new_password });
    } catch (e) {
      setErr(e.response?.data?.detail || "Errore reset");
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result.password);
  };

  if (result) {
    return (
      <Modal title="Password reimpostata" onClose={onClose}>
        <div
          style={{
            padding: "16px 18px",
            background: `${colors.green}10`,
            border: `1px solid ${colors.green}44`,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ color: colors.green, fontWeight: 600, marginBottom: 4 }}>
            ✓ Nuova password per {result.email}
          </div>
          <div style={{ color: colors.muted, fontSize: 12 }}>
            Questa password non sarà più visibile dopo la chiusura. Copiala ora e comunicala all'utente.
          </div>
        </div>

        <div
          style={{
            padding: 16,
            background: colors.panel,
            borderRadius: 10,
            fontFamily: "'SF Mono', 'Monaco', monospace",
            fontSize: 18,
            fontWeight: 700,
            color: colors.foam,
            textAlign: "center",
            marginBottom: 16,
            letterSpacing: 2,
            border: `1px dashed ${colors.border}`,
          }}
        >
          {result.password}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={copyToClipboard} style={{ ...S.btn, ...S.btnGold, flex: 1 }}>
            📋 Copia negli appunti
          </button>
          <button onClick={onClose} style={{ ...S.btn, flex: 1 }}>
            Ho comunicato la password
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Reset password di ${user.email}`} onClose={onClose}>
      {err && (
        <div
          style={{
            padding: 10,
            background: `${colors.red}15`,
            color: colors.red,
            border: `1px solid ${colors.red}44`,
            borderRadius: 8,
            marginBottom: 14,
            fontSize: 13,
          }}
        >
          {err}
        </div>
      )}

      <div style={{ color: colors.muted, fontSize: 13, marginBottom: 18 }}>
        Reimposti la password dell'utente. La password attuale verrà cancellata.
      </div>

      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: 14,
            background: mode === "auto" ? `${colors.lagoon}10` : "transparent",
            border: `2px solid ${mode === "auto" ? colors.lagoon : colors.border}`,
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          <input
            type="radio"
            checked={mode === "auto"}
            onChange={() => setMode("auto")}
            style={{ marginTop: 2 }}
          />
          <div>
            <div style={{ fontWeight: 600, color: colors.foam }}>
              Genera automaticamente 🎲
            </div>
            <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
              Password casuale di 12 caratteri (raccomandato)
            </div>
          </div>
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: 14,
            background: mode === "manual" ? `${colors.lagoon}10` : "transparent",
            border: `2px solid ${mode === "manual" ? colors.lagoon : colors.border}`,
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          <input
            type="radio"
            checked={mode === "manual"}
            onChange={() => setMode("manual")}
            style={{ marginTop: 2 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: colors.foam }}>
              Imposta manualmente
            </div>
            <div style={{ color: colors.muted, fontSize: 12, marginTop: 2, marginBottom: 8 }}>
              Minimo 6 caratteri
            </div>
            {mode === "manual" && (
              <input
                type="text"
                placeholder="Nuova password"
                style={S.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </div>
        </label>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ ...S.btn, ...S.btnGhost, flex: 1 }}>
          Annulla
        </button>
        <button onClick={reset} disabled={busy} style={{ ...S.btn, ...S.btnGold, flex: 2 }}>
          {busy ? "Reset in corso…" : "🔑 Reimposta password"}
        </button>
      </div>
    </Modal>
  );
}
