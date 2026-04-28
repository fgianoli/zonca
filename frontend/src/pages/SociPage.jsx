import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  membersApi,
  documentsApi,
  feesApi,
  exportsApi,
  invoicesApi,
  downloadBlob,
} from "../api/services";
import { getErrorMessage } from "../api/client";
import Modal from "../components/Modal";
import { colors, fonts, S, RUOLI, formatDate, formatEuro } from "../styles/theme";
import { useIsMobile } from "../hooks/useMediaQuery";

const EMPTY_MEMBER = {
  name: "",
  ruolo: "provin",
  tessera: "",
  email: "",
  phone: "",
  note: "",
};

const DOC_TYPES = [
  { value: "privacy", label: "Privacy" },
  { value: "assicurazione", label: "Assicurazione" },
  { value: "tessera_uisp", label: "Tessera UISP" },
  { value: "tessera_fic", label: "Tessera FIC" },
  { value: "altro", label: "Altro" },
];

const today = () => new Date().toISOString().split("T")[0];
const currentYear = new Date().getFullYear();

function certStatus(expiry) {
  if (!expiry) return { key: "missing", color: colors.red, icon: "✗", label: "Mancante" };
  const now = new Date();
  const exp = new Date(expiry);
  const diffDays = (exp - now) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return { key: "expired", color: colors.red, icon: "✗", label: "Scaduto" };
  if (diffDays <= 30) return { key: "expiring", color: colors.orange, icon: "⚠", label: "In scadenza" };
  return { key: "valid", color: colors.green, icon: "✓", label: "Valido" };
}

function RuoloBadge({ ruolo, small }) {
  const r = RUOLI[ruolo];
  if (!r) return null;
  return (
    <span
      style={{
        ...S.badge,
        backgroundColor: `${r.color}33`,
        color: r.color,
        border: `1px solid ${r.color}66`,
        fontSize: small ? 10 : 11,
      }}
    >
      {r.badge} {r.label}
    </span>
  );
}

export default function SociPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isMobile = useIsMobile();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("tutti");
  const [detail, setDetail] = useState(null); // member being viewed
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await membersApi.list();
      setMembers(data);
      setError("");
    } catch (e) {
      setError(getErrorMessage(e, "Errore nel caricamento"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const c = { tutti: members.length };
    Object.keys(RUOLI).forEach((k) => {
      c[k] = members.filter((m) => m.ruolo === k).length;
    });
    return c;
  }, [members]);

  const stats = useMemo(() => {
    const expiring = members.filter((m) => certStatus(m.medical_cert_expiry).key === "expiring").length;
    const expired = members.filter((m) => {
      const s = certStatus(m.medical_cert_expiry).key;
      return s === "expired" || s === "missing";
    }).length;
    const paid = members.filter((m) => m.fee_paid_current_year).length;
    const unpaid = members.length - paid;
    return { expiring, expired, paid, unpaid };
  }, [members]);

  const filtered = filter === "tutti" ? members : members.filter((m) => m.ruolo === filter);

  const handleDelete = async (m) => {
    if (!window.confirm(`Disattivare il socio ${m.name}?`)) return;
    try {
      await membersApi.update(m.id, { is_active: false });
      load();
    } catch (e) {
      alert(getErrorMessage(e, "Errore"));
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
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 12 : 0,
        }}
      >
        <div>
          <h1 style={{ ...S.title, fontSize: isMobile ? 24 : 30 }}>Soci & Ospiti</h1>
          <div style={S.subtitle}>{members.length} iscritti • gestione anagrafica, certificati, quote</div>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
            <button
              onClick={async () => {
                try {
                  const res = await exportsApi.members();
                  downloadBlob(res, "soci.csv");
                } catch (e) {
                  alert(getErrorMessage(e, "Errore export"));
                }
              }}
              style={{ ...S.btn, ...S.btnGhost, width: isMobile ? "100%" : "auto" }}
            >
              📥 Esporta CSV
            </button>
            <button
              onClick={() => setCreating(true)}
              style={{ ...S.btn, ...S.btnGold, color: colors.deep, width: isMobile ? "100%" : "auto" }}
            >
              + Nuovo socio
            </button>
          </div>
        )}
      </div>

      {/* stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(180px, 1fr))",
          gap: isMobile ? 8 : 12,
          marginBottom: 20,
        }}
      >
        <StatCard label="Cert. in scadenza" value={stats.expiring} color={colors.orange} icon="⚠" isMobile={isMobile} />
        <StatCard label="Cert. scaduti/mancanti" value={stats.expired} color={colors.red} icon="✗" isMobile={isMobile} />
        <StatCard label={`Quote ${currentYear} pagate`} value={stats.paid} color={colors.green} icon="✓" isMobile={isMobile} />
        <StatCard label={`Quote ${currentYear} da pagare`} value={stats.unpaid} color={colors.gold} icon="€" isMobile={isMobile} />
      </div>

      {/* filter tabs */}
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
        {["tutti", ...Object.keys(RUOLI)].map((f) => {
          const active = filter === f;
          const label = f === "tutti" ? "Tutti" : `${RUOLI[f].icon} ${RUOLI[f].label}`;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...S.btnSmall,
                backgroundColor: active ? colors.lagoon : "transparent",
                border: `1px solid ${active ? colors.lagoon : colors.muted}44`,
                color: active ? "#fff" : colors.muted,
                padding: "6px 14px",
                flexShrink: 0,
              }}
            >
              {label} <span style={{ opacity: 0.7 }}>({counts[f] || 0})</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{ ...S.card, borderColor: colors.red, color: colors.red, marginBottom: 12 }}>{error}</div>
      )}
      {loading ? (
        <div style={{ color: colors.muted }}>Caricamento…</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.length === 0 && (
            <div style={{ ...S.card, textAlign: "center", color: colors.muted }}>Nessun socio trovato.</div>
          )}
          {filtered.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              isAdmin={isAdmin}
              isMobile={isMobile}
              onDetail={() => setDetail(m)}
              onEdit={() => setEditing(m)}
              onDelete={() => handleDelete(m)}
            />
          ))}
        </div>
      )}

      {creating && (
        <MemberFormModal
          title="Nuovo socio"
          initial={EMPTY_MEMBER}
          onClose={() => setCreating(false)}
          onSave={async (form) => {
            await membersApi.create(form);
            setCreating(false);
            load();
          }}
        />
      )}

      {editing && (
        <MemberFormModal
          title="Modifica socio"
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (form) => {
            await membersApi.update(editing.id, form);
            setEditing(null);
            load();
          }}
        />
      )}

      {detail && (
        <DetailModal
          member={detail}
          isAdmin={isAdmin}
          currentUser={user}
          onClose={() => setDetail(null)}
          onMemberChange={(updated) => {
            setDetail(updated);
            load();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon, isMobile }) {
  return (
    <div
      style={{
        ...S.card,
        borderColor: `${color}66`,
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 8 : 12,
        padding: isMobile ? 12 : 20,
      }}
    >
      <div
        style={{
          width: isMobile ? 36 : 44,
          height: isMobile ? 36 : 44,
          borderRadius: "50%",
          backgroundColor: `${color}22`,
          color: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isMobile ? 16 : 20,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: colors.foam, fontSize: isMobile ? 20 : 24, fontWeight: 700, fontFamily: fonts.display }}>{value}</div>
        <div style={{ color: colors.muted, fontSize: isMobile ? 10 : 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function MemberRow({ member, isAdmin, isMobile, onDetail, onEdit, onDelete }) {
  const r = RUOLI[member.ruolo] || RUOLI.ospite;
  const cs = certStatus(member.medical_cert_expiry);
  const feeOk = !!member.fee_paid_current_year;

  return (
    <div
      style={{
        ...S.card,
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        gap: isMobile ? 10 : 14,
        padding: isMobile ? 14 : 20,
        opacity: member.is_active === false ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
        <div
          style={{
            width: isMobile ? 40 : 48,
            height: isMobile ? 40 : 48,
            borderRadius: "50%",
            backgroundColor: `${r.color}33`,
            border: `2px solid ${r.color}88`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isMobile ? 18 : 22,
            flexShrink: 0,
          }}
        >
          {r.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: colors.foam, fontWeight: 700, fontSize: isMobile ? 14 : 15 }}>{member.name}</span>
            <RuoloBadge ruolo={member.ruolo} small />
            {member.tessera && <span style={{ color: colors.muted, fontSize: 11 }}>#{member.tessera}</span>}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4, color: colors.muted, fontSize: 11 }}>
            {member.email && <span>✉ {member.email}</span>}
            {member.phone && <span>☎ {member.phone}</span>}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "row" : "column",
          alignItems: isMobile ? "flex-start" : "flex-end",
          flexWrap: "wrap",
          gap: 4,
          flexShrink: 0,
        }}
      >
        <span style={{ ...S.badge, backgroundColor: `${cs.color}22`, color: cs.color, border: `1px solid ${cs.color}55` }}>
          {cs.icon} Cert. {cs.label}
          {member.medical_cert_expiry && ` • ${formatDate(member.medical_cert_expiry)}`}
        </span>
        <span
          style={{
            ...S.badge,
            backgroundColor: feeOk ? `${colors.green}22` : `${colors.gold}22`,
            color: feeOk ? colors.green : colors.gold,
            border: `1px solid ${(feeOk ? colors.green : colors.gold)}55`,
          }}
        >
          Quota {currentYear}: {feeOk ? "pagata" : "non pagata"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
        <button onClick={onDetail} style={{ ...S.btnSmall, backgroundColor: colors.lagoon, color: "#fff", flex: isMobile ? 1 : "0 0 auto" }}>
          Dettaglio
        </button>
        {isAdmin && (
          <>
            <button onClick={onEdit} style={{ ...S.btnSmall, backgroundColor: `${colors.lagoon}33`, color: colors.foam, flex: isMobile ? 1 : "0 0 auto" }}>
              Modifica
            </button>
            <button onClick={onDelete} style={{ ...S.btnSmall, backgroundColor: `${colors.red}33`, color: colors.red }}>
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function MemberFormModal({ title, initial, onClose, onSave }) {
  const [form, setForm] = useState({ ...EMPTY_MEMBER, ...initial });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim()) {
      setErr("Nome obbligatorio");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } catch (e) {
      setErr(getErrorMessage(e, "Errore nel salvataggio"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      {err && <div style={{ color: colors.red, marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={S.label}>Nome e cognome *</label>
          <input style={S.input} value={form.name} onChange={set("name")} />
        </div>
        <div>
          <label style={S.label}>Ruolo</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Object.entries(RUOLI).map(([k, r]) => {
              const active = form.ruolo === k;
              return (
                <button
                  key={k}
                  onClick={() => setForm((f) => ({ ...f, ruolo: k }))}
                  style={{
                    ...S.btnSmall,
                    padding: "10px",
                    backgroundColor: active ? `${r.color}33` : "transparent",
                    border: `2px solid ${active ? r.color : colors.muted + "33"}`,
                    color: active ? r.color : colors.muted,
                    textAlign: "left",
                  }}
                >
                  {r.icon} {r.label}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={S.label}>N° tessera</label>
            <input style={S.input} value={form.tessera || ""} onChange={set("tessera")} />
          </div>
          <div>
            <label style={S.label}>Telefono</label>
            <input style={S.input} value={form.phone || ""} onChange={set("phone")} />
          </div>
        </div>
        <div>
          <label style={S.label}>Email</label>
          <input type="email" style={S.input} value={form.email || ""} onChange={set("email")} />
        </div>
        <div>
          <label style={S.label}>Note</label>
          <input style={S.input} value={form.note || ""} onChange={set("note")} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={onClose} style={{ ...S.btn, ...S.btnGhost, flex: 1 }}>Annulla</button>
        <button onClick={submit} disabled={saving} style={{ ...S.btn, flex: 2 }}>
          {saving ? "Salvataggio…" : "Salva"}
        </button>
      </div>
    </Modal>
  );
}

// ── Detail Modal with Tabs ─────────────────────────────────────────────────────
function DetailModal({ member, isAdmin, currentUser, onClose, onMemberChange }) {
  const [tab, setTab] = useState("anagrafica");
  const canEditThis = isAdmin || currentUser?.member_id === member.id;
  const isMobile = useIsMobile();

  const tabs = [
    { id: "anagrafica", label: "Anagrafica", icon: "👤" },
    { id: "medical", label: "Cert. Medico", icon: "🩺" },
    { id: "documenti", label: "Documenti", icon: "📁" },
    { id: "quote", label: "Quote", icon: "€" },
  ];

  return (
    <div
      style={{ ...S.modalOverlay, padding: isMobile ? 10 : 20, alignItems: isMobile ? "flex-start" : "center" }}
      onClick={onClose}
    >
      <div
        style={{
          ...S.modal,
          maxWidth: isMobile ? "100%" : 780,
          padding: isMobile ? 18 : 32,
          borderRadius: isMobile ? 12 : 18,
          marginTop: isMobile ? 8 : 0,
          maxHeight: isMobile ? "calc(100vh - 20px)" : "90vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontFamily: fonts.display, color: colors.gold, fontSize: 22, margin: 0 }}>{member.name}</h2>
            <div style={{ marginTop: 4 }}>
              <RuoloBadge ruolo={member.ruolo} />
              {member.tessera && <span style={{ color: colors.muted, marginLeft: 8, fontSize: 12 }}>#{member.tessera}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: colors.foam, fontSize: 26, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            borderBottom: `1px solid ${colors.lagoon}33`,
            marginBottom: 20,
            overflowX: isMobile ? "auto" : "visible",
            whiteSpace: isMobile ? "nowrap" : "normal",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  ...S.btnSmall,
                  backgroundColor: active ? colors.deep : "transparent",
                  color: active ? colors.gold : colors.muted,
                  border: "none",
                  borderBottom: active ? `2px solid ${colors.gold}` : "2px solid transparent",
                  borderRadius: 0,
                  padding: "10px 14px",
                  fontSize: 13,
                }}
              >
                {t.icon} {t.label}
              </button>
            );
          })}
        </div>

        {tab === "anagrafica" && (
          <AnagraficaTab member={member} canEdit={isAdmin} onChange={onMemberChange} />
        )}
        {tab === "medical" && (
          <MedicalTab member={member} canEdit={canEditThis} onChange={onMemberChange} />
        )}
        {tab === "documenti" && (
          <DocumentiTab member={member} canEdit={canEditThis} isAdmin={isAdmin} />
        )}
        {tab === "quote" && (
          <QuoteTab member={member} isAdmin={isAdmin} onMemberReload={onMemberChange} />
        )}
      </div>
    </div>
  );
}

function AnagraficaTab({ member, canEdit, onChange }) {
  const [form, setForm] = useState({
    name: member.name || "",
    ruolo: member.ruolo || "provin",
    tessera: member.tessera || "",
    email: member.email || "",
    phone: member.phone || "",
    note: member.note || "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const { data } = await membersApi.update(member.id, form);
      setMsg("Salvato ✓");
      onChange(data);
    } catch (e) {
      setMsg(getErrorMessage(e, "Errore"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Field label="Nome">
        <input style={S.input} value={form.name} onChange={set("name")} disabled={!canEdit} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Ruolo">
          <select style={S.input} value={form.ruolo} onChange={set("ruolo")} disabled={!canEdit}>
            {Object.entries(RUOLI).map(([k, r]) => (
              <option key={k} value={k}>{r.label}</option>
            ))}
          </select>
        </Field>
        <Field label="N° tessera">
          <input style={S.input} value={form.tessera} onChange={set("tessera")} disabled={!canEdit} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Email">
          <input style={S.input} value={form.email} onChange={set("email")} disabled={!canEdit} />
        </Field>
        <Field label="Telefono">
          <input style={S.input} value={form.phone} onChange={set("phone")} disabled={!canEdit} />
        </Field>
      </div>
      <Field label="Note">
        <textarea
          style={{ ...S.input, minHeight: 60, resize: "vertical", fontFamily: fonts.body }}
          value={form.note}
          onChange={set("note")}
          disabled={!canEdit}
        />
      </Field>
      {canEdit && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={save} disabled={saving} style={S.btn}>
            {saving ? "Salvataggio…" : "Salva modifiche"}
          </button>
          {msg && <span style={{ color: colors.green, fontSize: 12 }}>{msg}</span>}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

function MedicalTab({ member, canEdit, onChange }) {
  const [expiry, setExpiry] = useState(member.medical_cert_expiry || "");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const cs = certStatus(expiry);

  const saveExpiry = async () => {
    setBusy(true);
    setMsg("");
    try {
      const { data } = await membersApi.update(member.id, { medical_cert_expiry: expiry || null });
      onChange(data);
      setMsg("Scadenza aggiornata ✓");
    } catch (e) {
      setMsg(getErrorMessage(e, "Errore"));
    } finally {
      setBusy(false);
    }
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setMsg("");
    try {
      const { data } = await membersApi.uploadMedicalCert(member.id, file);
      onChange(data);
      setFile(null);
      setMsg("File caricato ✓");
    } catch (e) {
      setMsg(getErrorMessage(e, "Errore upload"));
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    try {
      const res = await membersApi.downloadMedicalCert(member.id);
      downloadBlob(res, `cert_medico_${member.name.replace(/\s+/g, "_")}`);
    } catch (e) {
      setMsg("Errore download");
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          ...S.card,
          borderColor: `${cs.color}66`,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 30, color: cs.color }}>{cs.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: cs.color, fontWeight: 700 }}>{cs.label}</div>
          <div style={{ color: colors.muted, fontSize: 12 }}>
            {member.medical_cert_expiry
              ? `Scadenza: ${formatDate(member.medical_cert_expiry)}`
              : "Nessuna scadenza impostata"}
          </div>
        </div>
        {member.medical_cert_file && (
          <button onClick={download} style={{ ...S.btnSmall, backgroundColor: colors.lagoon, color: "#fff" }}>
            ⬇ Scarica
          </button>
        )}
      </div>

      {canEdit && (
        <>
          <Field label="Data di scadenza">
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="date"
                style={S.input}
                value={expiry || ""}
                onChange={(e) => setExpiry(e.target.value)}
              />
              <button onClick={saveExpiry} disabled={busy} style={S.btn}>
                Salva
              </button>
            </div>
          </Field>

          <Field label="Carica certificato (PDF, JPG, PNG)">
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ ...S.input, padding: 8 }}
              />
              <button onClick={upload} disabled={!file || busy} style={{ ...S.btn, ...S.btnGreen }}>
                ⬆ Carica
              </button>
            </div>
          </Field>
          {msg && <div style={{ color: colors.green, fontSize: 12 }}>{msg}</div>}
        </>
      )}
    </div>
  );
}

function DocumentiTab({ member, canEdit, isAdmin }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState("privacy");
  const [expiry, setExpiry] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await documentsApi.list(member.id);
      setDocs(data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [member.id]);

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setMsg("");
    try {
      await documentsApi.upload(member.id, file, docType, expiry || null, note || null);
      setFile(null);
      setNote("");
      setExpiry("");
      setMsg("Documento caricato ✓");
      load();
    } catch (e) {
      setMsg(getErrorMessage(e, "Errore upload"));
    } finally {
      setBusy(false);
    }
  };

  const download = async (doc) => {
    try {
      const res = await documentsApi.download(member.id, doc.id);
      downloadBlob(res, doc.filename || `doc_${doc.id}`);
    } catch (e) {
      setMsg("Errore download");
    }
  };

  const remove = async (doc) => {
    if (!window.confirm(`Eliminare ${doc.filename || "documento"}?`)) return;
    try {
      await documentsApi.remove(member.id, doc.id);
      load();
    } catch (e) {
      setMsg(getErrorMessage(e, "Errore"));
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {loading ? (
        <div style={{ color: colors.muted }}>Caricamento…</div>
      ) : docs.length === 0 ? (
        <div style={{ color: colors.muted, fontStyle: "italic" }}>Nessun documento caricato.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {docs.map((d) => {
            const typeInfo = DOC_TYPES.find((t) => t.value === d.doc_type) || { label: d.doc_type };
            return (
              <div
                key={d.id}
                style={{ ...S.card, padding: 12, display: "flex", alignItems: "center", gap: 10 }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: colors.foam, fontWeight: 700, fontSize: 13 }}>
                    📄 {typeInfo.label}
                    {d.expiry_date && (
                      <span style={{ color: colors.muted, marginLeft: 6, fontSize: 11 }}>
                        • scad. {formatDate(d.expiry_date)}
                      </span>
                    )}
                  </div>
                  <div style={{ color: colors.muted, fontSize: 11 }}>
                    {d.filename}
                    {d.note && ` — ${d.note}`}
                  </div>
                </div>
                <button onClick={() => download(d)} style={{ ...S.btnSmall, backgroundColor: colors.lagoon, color: "#fff" }}>
                  ⬇
                </button>
                {(isAdmin || canEdit) && (
                  <button onClick={() => remove(d)} style={{ ...S.btnSmall, ...S.btnRed }}>
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canEdit && (
        <div style={{ ...S.card, padding: 14 }}>
          <div style={{ color: colors.gold, fontWeight: 700, marginBottom: 10 }}>Carica nuovo documento</div>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Tipo">
                <select style={S.input} value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {DOC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Scadenza (opzionale)">
                <input type="date" style={S.input} value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              </Field>
            </div>
            <Field label="Nota (opzionale)">
              <input style={S.input} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <Field label="File">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ ...S.input, padding: 8 }}
              />
            </Field>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={upload} disabled={!file || busy} style={{ ...S.btn, ...S.btnGreen }}>
                {busy ? "Caricamento…" : "⬆ Carica"}
              </button>
              {msg && <span style={{ color: colors.green, fontSize: 12 }}>{msg}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DEFAULT_FEE_AMOUNT = 50;

const emptyFeeForm = () => ({
  year: currentYear,
  amount: DEFAULT_FEE_AMOUNT,
  payment_method: "bonifico",
  paid: true,
  paid_date: today(),
  receipt_number: "",
  note: "",
});

function QuoteTab({ member, isAdmin, onMemberReload }) {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("ok"); // "ok" | "err"
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyFeeForm());

  const showMsg = (text, kind = "ok") => {
    setMsg(text);
    setMsgKind(kind);
    if (kind === "ok") setTimeout(() => setMsg(""), 2500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await feesApi.list({ member_id: member.id });
      setFees(data);
    } catch (e) {
      showMsg("Errore caricamento quote", "err");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [member.id]);

  const reloadAll = async () => {
    await load();
    // Refresh anche il parent (per aggiornare badge "pagata/non pagata" nella lista)
    if (onMemberReload) {
      try {
        const { data } = await membersApi.get(member.id);
        onMemberReload(data);
      } catch {
        // ignore
      }
    }
  };

  const save = async () => {
    if (!form.year || form.amount === "" || form.amount === null) {
      showMsg("Anno e importo sono obbligatori", "err");
      return;
    }
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        year: Number(form.year),
        member_id: member.id,
        paid_date: form.paid ? form.paid_date || today() : null,
      };
      await feesApi.create(payload);
      setAdding(false);
      setForm(emptyFeeForm());
      await reloadAll();
      showMsg("Quota salvata", "ok");
    } catch (e) {
      const detail = e.response?.data?.detail;
      if (e.response?.status === 409) {
        showMsg(`Esiste gia una quota per ${form.year}. Modificala dalla lista.`, "err");
      } else {
        showMsg(detail || "Errore salvataggio quota", "err");
      }
    }
  };

  const togglePaid = async (fee) => {
    try {
      await feesApi.update(fee.id, {
        paid: !fee.paid,
        paid_date: !fee.paid ? today() : null,
      });
      await reloadAll();
      showMsg(!fee.paid ? "Segnata come pagata" : "Segnata come non pagata", "ok");
    } catch (e) {
      showMsg(getErrorMessage(e, "Errore aggiornamento"), "err");
    }
  };

  const remove = async (fee) => {
    if (!window.confirm(`Eliminare la quota ${fee.year} di ${formatEuro(fee.amount)}?`)) return;
    try {
      await feesApi.remove(fee.id);
      await reloadAll();
      showMsg("Quota eliminata", "ok");
    } catch (e) {
      showMsg(getErrorMessage(e, "Errore eliminazione"), "err");
    }
  };

  const grouped = fees.reduce((acc, f) => {
    (acc[f.year] = acc[f.year] || []).push(f);
    return acc;
  }, {});
  const years = Object.keys(grouped).sort((a, b) => b - a);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {loading ? (
        <div style={{ color: colors.muted }}>Caricamento…</div>
      ) : years.length === 0 ? (
        <div style={{ color: colors.muted, fontStyle: "italic" }}>Nessuna quota registrata.</div>
      ) : (
        years.map((y) => (
          <div key={y}>
            <div style={{ color: colors.gold, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Anno {y}</div>
            <div style={{ display: "grid", gap: 6 }}>
              {grouped[y].map((f) => (
                <div
                  key={f.id}
                  style={{ ...S.card, padding: 12, display: "flex", alignItems: "center", gap: 10 }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ color: colors.foam, fontWeight: 700, fontSize: 13 }}>
                      {formatEuro(f.amount)} • {f.payment_method || "—"}
                    </div>
                    <div style={{ color: colors.muted, fontSize: 11 }}>
                      {f.paid ? `Pagata il ${formatDate(f.paid_date)}` : "Da pagare"}
                      {f.receipt_number && ` • ric. ${f.receipt_number}`}
                      {f.note && ` — ${f.note}`}
                    </div>
                  </div>
                  <span
                    style={{
                      ...S.badge,
                      backgroundColor: f.paid ? `${colors.green}22` : `${colors.gold}22`,
                      color: f.paid ? colors.green : colors.gold,
                    }}
                  >
                    {f.paid ? "✓ Pagata" : "⏳ Attesa"}
                  </span>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => togglePaid(f)}
                        style={{
                          ...S.btnSmall,
                          backgroundColor: f.paid ? `${colors.gold}33` : `${colors.green}`,
                          color: f.paid ? colors.gold : "#fff",
                        }}
                      >
                        {f.paid ? "Non pag." : "✓ Pagata"}
                      </button>
                      {f.paid && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await invoicesApi.fromFee(f.id);
                              const inv = res.data;
                              showMsg(
                                `Fattura ${inv.number || "creata"} generata`,
                                "ok"
                              );
                              if (inv?.id) {
                                try {
                                  const pdfRes = await invoicesApi.downloadPdf(inv.id);
                                  downloadBlob(
                                    pdfRes,
                                    `fattura_${inv.number || inv.id}.pdf`
                                  );
                                } catch {
                                  // ignore download err
                                }
                              }
                            } catch (e) {
                              showMsg(
                                getErrorMessage(e, "Errore generazione fattura"),
                                "err"
                              );
                            }
                          }}
                          title="Genera fattura"
                          style={{
                            ...S.btnSmall,
                            background: `${colors.lagoon}22`,
                            color: colors.lagoon,
                          }}
                        >
                          🧾 Fattura
                        </button>
                      )}
                      <button onClick={() => remove(f)} style={{ ...S.btnSmall, ...S.btnRed }}>
                        ✕
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {isAdmin && !adding && (
        <button onClick={() => setAdding(true)} style={{ ...S.btn, ...S.btnGold, color: colors.deep, justifySelf: "start" }}>
          + Aggiungi quota
        </button>
      )}

      {isAdmin && adding && (
        <div style={{ ...S.card, padding: 14 }}>
          <div style={{ color: colors.gold, fontWeight: 700, marginBottom: 10 }}>Nuova quota</div>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Field label="Anno">
                <input
                  type="number"
                  style={S.input}
                  value={form.year}
                  onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Importo €">
                <input
                  type="number"
                  step="0.01"
                  style={S.input}
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Metodo">
                <select
                  style={S.input}
                  value={form.payment_method}
                  onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
                >
                  <option value="bonifico">Bonifico</option>
                  <option value="contanti">Contanti</option>
                  <option value="pos">POS</option>
                  <option value="altro">Altro</option>
                </select>
              </Field>
            </div>
            <label style={{ color: colors.foam, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={form.paid}
                onChange={(e) => setForm((f) => ({ ...f, paid: e.target.checked, paid_date: e.target.checked ? today() : "" }))}
                style={{ marginRight: 6 }}
              />
              Già pagata
            </label>
            {form.paid && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Data pagamento">
                  <input
                    type="date"
                    style={S.input}
                    value={form.paid_date}
                    onChange={(e) => setForm((f) => ({ ...f, paid_date: e.target.value }))}
                  />
                </Field>
                <Field label="N° ricevuta">
                  <input
                    style={S.input}
                    value={form.receipt_number}
                    onChange={(e) => setForm((f) => ({ ...f, receipt_number: e.target.value }))}
                  />
                </Field>
              </div>
            )}
            <Field label="Note">
              <input style={S.input} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </Field>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setAdding(false)} style={{ ...S.btn, ...S.btnGhost, flex: 1 }}>Annulla</button>
              <button onClick={save} style={{ ...S.btn, flex: 2 }}>Salva quota</button>
            </div>
          </div>
        </div>
      )}

      {msg && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            backgroundColor: msgKind === "ok" ? `${colors.green}22` : `${colors.red}22`,
            color: msgKind === "ok" ? colors.green : colors.red,
            border: `1px solid ${msgKind === "ok" ? colors.green : colors.red}66`,
            fontSize: 13,
          }}
        >
          {msg}
        </div>
      )}
    </div>
  );
}
