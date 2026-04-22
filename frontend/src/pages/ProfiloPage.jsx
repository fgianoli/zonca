import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  membersApi,
  documentsApi,
  feesApi,
  bookingsApi,
  icalApi,
  gdprApi,
  downloadBlob,
} from "../api/services";
import { S, colors, fonts, RUOLI, formatDate, formatEuro, TIPI_BARCA } from "../styles/theme";
import { ChangePasswordForm } from "../components/ChangePasswordModal";
import { useIsMobile } from "../hooks/useMediaQuery";

const DOC_TYPES = [
  { value: "privacy", label: "Privacy" },
  { value: "assicurazione", label: "Assicurazione" },
  { value: "tessera_uisp", label: "Tessera UISP" },
  { value: "tessera_fic", label: "Tessera FIC" },
  { value: "altro", label: "Altro" },
];

function certStatus(expiry) {
  if (!expiry) return { key: "missing", color: colors.red, icon: "✗", label: "Mancante" };
  const now = new Date();
  const exp = new Date(expiry);
  const diffDays = (exp - now) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return { key: "expired", color: colors.red, icon: "✗", label: "Scaduto" };
  if (diffDays <= 30) return { key: "expiring", color: colors.orange, icon: "⚠", label: "In scadenza" };
  return { key: "valid", color: colors.green, icon: "✓", label: "Valido" };
}

const TABS = [
  { id: "info", label: "Le mie info", icon: "👤" },
  { id: "prenotazioni", label: "Prenotazioni", icon: "📋" },
  { id: "quote", label: "Quote", icon: "€" },
  { id: "documenti", label: "Documenti", icon: "📁" },
  { id: "password", label: "Password", icon: "🔑" },
  { id: "ical", label: "iCal", icon: "📅" },
  { id: "gdpr", label: "GDPR", icon: "🛡" },
];

const currentYear = new Date().getFullYear();

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
      }}
    >
      {children}
    </div>
  );
}

export default function ProfiloPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("info");
  const isMobile = useIsMobile();

  return (
    <div style={{ ...S.container, padding: isMobile ? "16px 12px" : "32px 24px" }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ ...S.title, fontSize: isMobile ? 24 : 30 }}>Il mio profilo</h1>
        <div style={S.subtitle}>{user?.email}</div>
      </div>

      {/* Tabs */}
      <div
        style={
          isMobile
            ? {
                display: "flex",
                gap: 4,
                borderBottom: `1px solid ${colors.border}`,
                marginBottom: 20,
                overflowX: "auto",
                whiteSpace: "nowrap",
                paddingBottom: 4,
                WebkitOverflowScrolling: "touch",
              }
            : {
                display: "flex",
                gap: 4,
                borderBottom: `1px solid ${colors.border}`,
                marginBottom: 20,
                flexWrap: "wrap",
              }
        }
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                ...S.btnSmall,
                background: active ? colors.gradLagoon : "transparent",
                color: active ? "#fff" : colors.muted,
                border: "none",
                borderBottom: active ? `2px solid ${colors.lagoon}` : "2px solid transparent",
                borderRadius: active ? 10 : 0,
                padding: "10px 14px",
                fontSize: 13,
                boxShadow: active ? colors.shadowLagoon : "none",
                flexShrink: 0,
              }}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      {tab === "info" && <InfoTab user={user} />}
      {tab === "prenotazioni" && <PrenotazioniTab user={user} />}
      {tab === "quote" && <QuoteTab user={user} />}
      {tab === "documenti" && <DocumentiTab user={user} />}
      {tab === "password" && (
        <div style={{ maxWidth: 500 }}>
          <div style={{ ...S.card }}>
            <ChangePasswordForm />
          </div>
        </div>
      )}
      {tab === "ical" && <IcalTab />}
      {tab === "gdpr" && <GdprTab />}
    </div>
  );
}

// ── GDPR Tab ─────────────────────────────────────────────────────────────
function GdprTab() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [sent, setSent] = useState(false);

  const downloadData = async () => {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const res = await gdprApi.myData();
      const today = new Date().toISOString().split("T")[0];
      downloadBlob(res, `miei_dati_zonca_${today}.json`);
      setMsg("Download avviato ✓");
    } catch (e) {
      setErr(e.response?.data?.detail || "Errore durante il download");
    } finally {
      setBusy(false);
    }
  };

  const submitDelete = async () => {
    if (!confirm) {
      setErr("Devi confermare la richiesta");
      return;
    }
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      await gdprApi.requestDelete(reason);
      setSent(true);
      setShowDelete(false);
      setReason("");
      setConfirm(false);
    } catch (e) {
      setErr(e.response?.data?.detail || "Errore invio richiesta");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 720 }}>
      <div style={{ ...S.card }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 17,
            color: colors.lagoon,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          🛡 I tuoi diritti GDPR
        </div>
        <p style={{ color: colors.muted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          Ai sensi degli articoli 15-22 del GDPR (Regolamento UE 2016/679) hai il diritto di
          accedere ai tuoi dati personali, riceverli in formato portabile e richiederne la
          cancellazione. Per maggiori dettagli consulta la{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: colors.lagoon, fontWeight: 600 }}
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>

      {msg && <Banner kind="ok">{msg}</Banner>}
      {err && <Banner kind="err">{err}</Banner>}
      {sent && (
        <Banner kind="ok">
          Richiesta inviata. L'amministratore prenderà in carico la tua richiesta entro 30 giorni.
        </Banner>
      )}

      <div style={{ ...S.card, borderLeft: `4px solid ${colors.lagoon}` }}>
        <div style={{ color: colors.foam, fontWeight: 700, marginBottom: 6 }}>
          📥 Scarica i miei dati
        </div>
        <div style={{ color: colors.muted, fontSize: 13, marginBottom: 10, lineHeight: 1.6 }}>
          Riceverai un file JSON con tutti i dati personali che la remiera conserva su di te
          (anagrafica, quote, presenze, documenti).
        </div>
        <button onClick={downloadData} disabled={busy} style={S.btn}>
          {busy ? "Preparazione…" : "📥 Scarica i miei dati"}
        </button>
      </div>

      <div style={{ ...S.card, borderLeft: `4px solid ${colors.red}` }}>
        <div style={{ color: colors.foam, fontWeight: 700, marginBottom: 6 }}>
          🗑 Richiedi cancellazione
        </div>
        <div style={{ color: colors.muted, fontSize: 13, marginBottom: 10, lineHeight: 1.6 }}>
          Invia una richiesta formale di cancellazione dei tuoi dati. Alcuni dati potranno
          essere conservati per adempiere a obblighi fiscali.
        </div>
        {!showDelete ? (
          <button onClick={() => setShowDelete(true)} style={{ ...S.btn, ...S.btnRed }}>
            🗑 Richiedi cancellazione
          </button>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={S.label}>Motivo (facoltativo)</label>
              <textarea
                style={{
                  ...S.input,
                  minHeight: 80,
                  resize: "vertical",
                  fontFamily: fonts.body,
                }}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Per esempio: non sono più socio della remiera…"
              />
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                color: colors.foam,
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <input
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>
                Confermo di voler richiedere la cancellazione dei miei dati personali dal
                gestionale della Remiera Zonca.
              </span>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => {
                  setShowDelete(false);
                  setReason("");
                  setConfirm(false);
                  setErr("");
                }}
                style={{ ...S.btn, ...S.btnGhost, flex: 1 }}
              >
                Annulla
              </button>
              <button
                onClick={submitDelete}
                disabled={busy || !confirm}
                style={{ ...S.btn, ...S.btnRed, flex: 2, opacity: !confirm ? 0.5 : 1 }}
              >
                {busy ? "Invio…" : "Invia richiesta"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NoMemberCard() {
  return (
    <div style={{ ...S.card, textAlign: "center", color: colors.muted }}>
      <div style={{ fontSize: 38, marginBottom: 10 }}>🔗</div>
      <div style={{ color: colors.foam, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
        Account non collegato
      </div>
      <div>Il tuo account non è collegato a nessun socio. Contatta un admin per collegarlo.</div>
    </div>
  );
}

// ── Info Tab ─────────────────────────────────────────────────────────────
function InfoTab({ user }) {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isMobile = useIsMobile();

  const load = async () => {
    if (!user?.member_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await membersApi.get(user.member_id);
      setMember(data);
      setError("");
    } catch (e) {
      setError(e.response?.data?.detail || "Errore caricamento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [user?.member_id]);

  if (!user?.member_id) return <NoMemberCard />;
  if (loading) return <div style={{ color: colors.muted }}>Caricamento…</div>;
  if (error) return <Banner kind="err">{error}</Banner>;
  if (!member) return <NoMemberCard />;

  const r = RUOLI[member.ruolo] || RUOLI.ospite;
  const cs = certStatus(member.medical_cert_expiry);
  const feeOk = !!member.fee_paid_current_year;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          ...S.cardElevated,
          display: "flex",
          gap: isMobile ? 12 : 18,
          alignItems: "center",
          flexDirection: isMobile ? "column" : "row",
          textAlign: isMobile ? "center" : "left",
          padding: isMobile ? 18 : 24,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: `${r.color}22`,
            border: `3px solid ${r.color}88`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            flexShrink: 0,
          }}
        >
          {r.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 700, color: colors.foam }}>
            {member.name}
          </div>
          <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: isMobile ? "center" : "flex-start" }}>
            <span
              style={{
                ...S.badge,
                backgroundColor: `${r.color}22`,
                color: r.color,
                border: `1px solid ${r.color}66`,
              }}
            >
              {r.badge} {r.label}
            </span>
            {member.tessera && (
              <span style={{ ...S.badge, background: `${colors.lagoon}15`, color: colors.lagoon }}>
                Tessera #{member.tessera}
              </span>
            )}
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap", color: colors.muted, fontSize: 13, justifyContent: isMobile ? "center" : "flex-start" }}>
            {member.email && <span>✉ {member.email}</span>}
            {member.phone && <span>☎ {member.phone}</span>}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <div style={{ ...S.card, borderLeft: `4px solid ${cs.color}` }}>
          <div style={{ color: colors.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
            Certificato medico
          </div>
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20, color: cs.color }}>{cs.icon}</span>
            <span style={{ color: cs.color, fontWeight: 700 }}>{cs.label}</span>
          </div>
          <div style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
            {member.medical_cert_expiry
              ? `Scadenza: ${formatDate(member.medical_cert_expiry)}`
              : "Nessuna scadenza impostata"}
          </div>
          {(cs.key === "expired" || cs.key === "missing") && (
            <div style={{ marginTop: 10 }}>
              <a
                href="#documenti"
                onClick={(e) => {
                  e.preventDefault();
                  const btns = document.querySelectorAll("button");
                  btns.forEach((b) => {
                    if (b.textContent && b.textContent.includes("Documenti")) b.click();
                  });
                }}
                style={{
                  display: "inline-block",
                  padding: "8px 14px",
                  background: colors.gradLagoon,
                  color: "#fff",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  boxShadow: colors.shadowLagoon,
                }}
              >
                ⬆ Carica certificato medico
              </a>
            </div>
          )}
        </div>

        <div style={{ ...S.card, borderLeft: `4px solid ${feeOk ? colors.green : colors.gold}` }}>
          <div style={{ color: colors.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
            Quota {currentYear}
          </div>
          <div style={{ marginTop: 6 }}>
            <span
              style={{
                ...S.badge,
                backgroundColor: feeOk ? `${colors.green}22` : `${colors.gold}22`,
                color: feeOk ? colors.green : colors.gold,
                border: `1px solid ${(feeOk ? colors.green : colors.gold)}55`,
                fontSize: 13,
              }}
            >
              {feeOk ? "✓ Pagata" : "⏳ Non pagata"}
            </span>
          </div>
          {member.note && (
            <div style={{ marginTop: 10, color: colors.muted, fontSize: 12 }}>
              <strong>Note:</strong> {member.note}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Prenotazioni Tab ─────────────────────────────────────────────────────
function PrenotazioniTab({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await bookingsApi.list();
      setBookings(data);
    } catch (e) {
      setErr(e.response?.data?.detail || "Errore caricamento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const mine = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.created_by === user?.id ||
        b.pope_id === user?.member_id ||
        (b.partecipanti || []).some((p) => p.member_id === user?.member_id || p.id === user?.member_id)
    );
  }, [bookings, user]);

  const todayISO = new Date().toISOString().split("T")[0];
  const future = mine.filter((b) => b.date >= todayISO).sort((a, b) => (a.date + (a.slot || "")).localeCompare(b.date + (b.slot || "")));
  const past = mine.filter((b) => b.date < todayISO).sort((a, b) => (b.date + (b.slot || "")).localeCompare(a.date + (a.slot || "")));

  const remove = async (b) => {
    if (!window.confirm("Eliminare questa prenotazione?")) return;
    try {
      await bookingsApi.remove(b.id);
      setMsg("Prenotazione eliminata");
      load();
    } catch (e) {
      setErr(e.response?.data?.detail || "Errore");
    }
  };

  if (!user?.member_id) return <NoMemberCard />;
  if (loading) return <div style={{ color: colors.muted }}>Caricamento…</div>;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {msg && <Banner kind="ok">{msg}</Banner>}
      {err && <Banner kind="err">{err}</Banner>}

      <div>
        <div style={{ fontFamily: fonts.display, fontSize: 18, color: colors.lagoon, fontWeight: 700, marginBottom: 10 }}>
          🔜 Future ({future.length})
        </div>
        {future.length === 0 ? (
          <div style={{ ...S.card, color: colors.muted, fontStyle: "italic" }}>Nessuna prenotazione futura.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {future.map((b) => (
              <BookingRow key={b.id} b={b} user={user} onRemove={remove} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontFamily: fonts.display, fontSize: 18, color: colors.muted, fontWeight: 700, marginBottom: 10 }}>
          📜 Passate ({past.length})
        </div>
        {past.length === 0 ? (
          <div style={{ ...S.card, color: colors.muted, fontStyle: "italic" }}>Nessuna prenotazione passata.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {past.slice(0, 20).map((b) => (
              <BookingRow key={b.id} b={b} user={user} onRemove={remove} past />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingRow({ b, user, onRemove, past }) {
  const boat = TIPI_BARCA[b.boat_type] || TIPI_BARCA.altro;
  const canDelete = b.created_by === user?.id && !past;
  const partecipantiNames = (b.partecipanti || []).map((p) => p.name).filter(Boolean).join(", ");
  return (
    <div style={{ ...S.card, display: "flex", gap: 12, alignItems: "center", opacity: past ? 0.75 : 1 }}>
      <div style={{ fontSize: 28 }}>{boat.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: colors.foam, fontWeight: 700, fontSize: 14 }}>
          {formatDate(b.date)} • {b.slot}
        </div>
        <div style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>
          {b.boat_name || boat.label}
          {b.pope_name && ` • Pope: ${b.pope_name}`}
          {partecipantiNames && ` • Partecipanti: ${partecipantiNames}`}
        </div>
      </div>
      <span
        style={{
          ...S.badge,
          background: b.confirmed ? `${colors.green}22` : `${colors.gold}22`,
          color: b.confirmed ? colors.green : colors.gold,
          border: `1px solid ${(b.confirmed ? colors.green : colors.gold)}44`,
        }}
      >
        {b.confirmed ? "✓ Confermata" : "⏳ In attesa"}
      </span>
      {canDelete && (
        <button onClick={() => onRemove(b)} style={{ ...S.btnSmall, ...S.btnRed }}>
          ✕
        </button>
      )}
    </div>
  );
}

// ── Quote Tab ────────────────────────────────────────────────────────────
function QuoteTab({ user }) {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user?.member_id) {
      setLoading(false);
      return;
    }
    feesApi
      .list({ member_id: user.member_id })
      .then((r) => setFees(r.data))
      .catch((e) => setErr(e.response?.data?.detail || "Errore"))
      .finally(() => setLoading(false));
  }, [user?.member_id]);

  if (!user?.member_id) return <NoMemberCard />;
  if (loading) return <div style={{ color: colors.muted }}>Caricamento…</div>;
  if (err) return <Banner kind="err">{err}</Banner>;

  const grouped = fees.reduce((acc, f) => {
    (acc[f.year] = acc[f.year] || []).push(f);
    return acc;
  }, {});
  const years = Object.keys(grouped).sort((a, b) => b - a);

  if (years.length === 0) {
    return <div style={{ ...S.card, color: colors.muted, fontStyle: "italic" }}>Nessuna quota registrata.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {years.map((y) => (
        <div key={y}>
          <div style={{ color: colors.gold, fontWeight: 700, fontSize: 15, marginBottom: 8, fontFamily: fonts.display }}>
            Anno {y}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {grouped[y].map((f) => (
              <div key={f.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: colors.foam, fontWeight: 700, fontSize: 14 }}>
                    {formatEuro(f.amount)} • {f.payment_method || "—"}
                  </div>
                  <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                    {f.paid ? `Pagata il ${formatDate(f.paid_date)}` : "Da pagare"}
                    {f.receipt_number && ` • ricevuta #${f.receipt_number}`}
                    {f.note && ` — ${f.note}`}
                  </div>
                </div>
                <span
                  style={{
                    ...S.badge,
                    background: f.paid ? `${colors.green}22` : `${colors.gold}22`,
                    color: f.paid ? colors.green : colors.gold,
                    border: `1px solid ${(f.paid ? colors.green : colors.gold)}44`,
                  }}
                >
                  {f.paid ? "✓ Pagata" : "⏳ Attesa"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Documenti Tab ────────────────────────────────────────────────────────
function DocumentiTab({ user }) {
  const [member, setMember] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // medical cert
  const [medExpiry, setMedExpiry] = useState("");
  const [medFile, setMedFile] = useState(null);
  const [busy, setBusy] = useState(false);

  // doc upload
  const [docType, setDocType] = useState("privacy");
  const [docExpiry, setDocExpiry] = useState("");
  const [docNote, setDocNote] = useState("");
  const [docFile, setDocFile] = useState(null);

  const load = async () => {
    if (!user?.member_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [m, d] = await Promise.all([
        membersApi.get(user.member_id),
        documentsApi.list(user.member_id),
      ]);
      setMember(m.data);
      setMedExpiry(m.data.medical_cert_expiry || "");
      setDocs(d.data);
    } catch (e) {
      setErr(e.response?.data?.detail || "Errore caricamento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [user?.member_id]);

  const saveMedExpiry = async () => {
    setBusy(true);
    setMsg(""); setErr("");
    try {
      await membersApi.update(user.member_id, { medical_cert_expiry: medExpiry || null });
      setMsg("Scadenza aggiornata ✓");
      load();
    } catch (e) {
      setErr(e.response?.data?.detail || "Errore");
    } finally {
      setBusy(false);
    }
  };

  const uploadMed = async () => {
    if (!medFile) return;
    if (medFile.size > 10 * 1024 * 1024) {
      setErr("File troppo grande (max 10MB)");
      return;
    }
    setBusy(true);
    setMsg(""); setErr("");
    try {
      await membersApi.uploadMedicalCert(user.member_id, medFile);
      setMedFile(null);
      setMsg("Certificato caricato ✓");
      load();
    } catch (e) {
      setErr(e.response?.data?.detail || "Errore upload");
    } finally {
      setBusy(false);
    }
  };

  const downloadMed = async () => {
    try {
      const res = await membersApi.downloadMedicalCert(user.member_id);
      downloadBlob(res, `cert_medico_${member?.name?.replace(/\s+/g, "_") || user.member_id}`);
    } catch (e) {
      setErr("Errore download");
    }
  };

  const uploadDoc = async () => {
    if (!docFile) return;
    setBusy(true);
    setMsg(""); setErr("");
    try {
      await documentsApi.upload(user.member_id, docFile, docType, docExpiry || null, docNote || null);
      setDocFile(null);
      setDocNote("");
      setDocExpiry("");
      setMsg("Documento caricato ✓");
      load();
    } catch (e) {
      setErr(e.response?.data?.detail || "Errore upload");
    } finally {
      setBusy(false);
    }
  };

  const downloadDoc = async (d) => {
    try {
      const res = await documentsApi.download(user.member_id, d.id);
      downloadBlob(res, d.filename || `doc_${d.id}`);
    } catch (e) {
      setErr("Errore download");
    }
  };

  if (!user?.member_id) return <NoMemberCard />;
  if (loading) return <div style={{ color: colors.muted }}>Caricamento…</div>;

  const cs = certStatus(medExpiry);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {msg && <Banner kind="ok">{msg}</Banner>}
      {err && <Banner kind="err">{err}</Banner>}

      {/* Medical cert */}
      <div style={{ ...S.card }}>
        <div style={{ fontFamily: fonts.display, fontSize: 17, color: colors.lagoon, fontWeight: 700, marginBottom: 12 }}>
          🩺 Certificato medico
        </div>
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: `${cs.color}10`,
            border: `1px solid ${cs.color}44`,
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 24, color: cs.color }}>{cs.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: cs.color, fontWeight: 700 }}>{cs.label}</div>
            <div style={{ color: colors.muted, fontSize: 12 }}>
              {member?.medical_cert_expiry
                ? `Scadenza: ${formatDate(member.medical_cert_expiry)}`
                : "Nessuna scadenza impostata"}
            </div>
          </div>
          {member?.medical_cert_file && (
            <button onClick={downloadMed} style={{ ...S.btnSmall, background: colors.lagoon, color: "#fff" }}>
              ⬇ Scarica
            </button>
          )}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <label style={S.label}>Data di scadenza</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="date"
                style={S.input}
                value={medExpiry || ""}
                onChange={(e) => setMedExpiry(e.target.value)}
              />
              <button onClick={saveMedExpiry} disabled={busy} style={S.btn}>
                Salva
              </button>
            </div>
          </div>
          <div>
            <label style={S.label}>Carica certificato (PDF, JPG, PNG — max 10MB)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(e) => setMedFile(e.target.files?.[0] || null)}
                style={{ ...S.input, padding: 8 }}
              />
              <button
                onClick={uploadMed}
                disabled={!medFile || busy}
                style={{ ...S.btn, ...S.btnGreen }}
              >
                ⬆ Carica
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Other documents */}
      <div style={{ ...S.card }}>
        <div style={{ fontFamily: fonts.display, fontSize: 17, color: colors.lagoon, fontWeight: 700, marginBottom: 12 }}>
          📁 Altri documenti
        </div>

        {docs.length === 0 ? (
          <div style={{ color: colors.muted, fontStyle: "italic", marginBottom: 14 }}>Nessun documento caricato.</div>
        ) : (
          <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
            {docs.map((d) => {
              const typeInfo = DOC_TYPES.find((t) => t.value === d.doc_type) || { label: d.doc_type };
              return (
                <div
                  key={d.id}
                  style={{
                    border: `1px solid ${colors.borderSoft}`,
                    borderRadius: 10,
                    padding: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
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
                  <button
                    onClick={() => downloadDoc(d)}
                    style={{ ...S.btnSmall, background: colors.lagoon, color: "#fff" }}
                  >
                    ⬇
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={S.label}>Tipo documento</label>
              <select style={S.input} value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>Scadenza (opzionale)</label>
              <input
                type="date"
                style={S.input}
                value={docExpiry}
                onChange={(e) => setDocExpiry(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label style={S.label}>Nota (opzionale)</label>
            <input style={S.input} value={docNote} onChange={(e) => setDocNote(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>File</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="file"
                onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                style={{ ...S.input, padding: 8 }}
              />
              <button
                onClick={uploadDoc}
                disabled={!docFile || busy}
                style={{ ...S.btn, ...S.btnGreen }}
              >
                ⬆ Carica
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── iCal Tab ─────────────────────────────────────────────────────────────
function IcalTab() {
  const [token, setToken] = useState(null);
  const [urls, setUrls] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const generate = async () => {
    setBusy(true);
    setMsg(""); setErr("");
    try {
      const { data } = await icalApi.generateToken();
      setToken(data.token);
      setUrls(data.urls || null);
      setMsg("Link calendario generato ✓");
    } catch (e) {
      setErr(e.response?.data?.detail || "Errore generazione token");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!window.confirm("Revocare il link calendario? I calendari già iscritti smetteranno di ricevere aggiornamenti.")) return;
    setBusy(true);
    setMsg(""); setErr("");
    try {
      await icalApi.revokeToken();
      setToken(null);
      setUrls(null);
      setMsg("Token revocato");
    } catch (e) {
      setErr(e.response?.data?.detail || "Errore revoca");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setMsg("Link copiato ✓");
      setTimeout(() => setMsg(""), 1500);
    } catch {
      setErr("Impossibile copiare il link");
    }
  };

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 720 }}>
      <div style={{ ...S.card }}>
        <div style={{ fontFamily: fonts.display, fontSize: 17, color: colors.lagoon, fontWeight: 700, marginBottom: 6 }}>
          📅 Feed iCal
        </div>
        <div style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>
          Sottoscrivi il calendario della remiera dal tuo smartphone o PC.
          Ogni link contiene un token personale — non condividerlo.
        </div>

        {msg && <div style={{ marginBottom: 10 }}><Banner kind="ok">{msg}</Banner></div>}
        {err && <div style={{ marginBottom: 10 }}><Banner kind="err">{err}</Banner></div>}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={generate} disabled={busy} style={S.btn}>
            {token ? "🔄 Rigenera link" : "🔑 Genera link calendario"}
          </button>
          {token && (
            <button onClick={revoke} disabled={busy} style={{ ...S.btn, ...S.btnRed }}>
              ✕ Revoca
            </button>
          )}
        </div>

        {urls && (
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {urls.mine && (
              <UrlRow label="Solo le mie uscite" url={urls.mine} onCopy={() => copy(urls.mine)} />
            )}
            {urls.all && (
              <UrlRow
                label="Tutte le uscite + eventi"
                url={urls.all}
                onCopy={() => copy(urls.all)}
              />
            )}
          </div>
        )}
      </div>

      <div style={{ ...S.card, background: colors.panel }}>
        <div style={{ color: colors.foam, fontWeight: 700, marginBottom: 8 }}>Come usarlo</div>
        <div style={{ color: colors.muted, fontSize: 13, lineHeight: 1.6 }}>
          Incolla questo link in <strong>Google Calendar</strong> → "Aggiungi calendario" → "Da URL",
          oppure in <strong>Apple Calendar</strong> → "File" → "Nuova sottoscrizione".
        </div>
      </div>
    </div>
  );
}

function UrlRow({ label, url, onCopy }) {
  return (
    <div
      style={{
        padding: 12,
        border: `1px solid ${colors.borderSoft}`,
        borderRadius: 10,
        background: colors.panel,
      }}
    >
      <div style={{ color: colors.lagoon, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input readOnly value={url} style={{ ...S.input, fontSize: 12, fontFamily: "monospace" }} />
        <button onClick={onCopy} style={{ ...S.btnSmall, background: colors.gradLagoon, color: "#fff" }}>
          Copia
        </button>
      </div>
    </div>
  );
}
