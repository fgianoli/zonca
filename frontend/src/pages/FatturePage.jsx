import { useEffect, useState, useMemo } from "react";
import { invoicesApi, membersApi, downloadBlob } from "../api/services";
import Modal from "../components/Modal";
import { S, colors, fonts, formatDate, formatEuro } from "../styles/theme";

const currentYear = new Date().getFullYear();
const years = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

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

export default function FatturePage() {
  const [invoices, setInvoices] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [year, setYear] = useState(currentYear);
  const [memberSearch, setMemberSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (year) params.year = year;
      const [i, m] = await Promise.all([
        invoicesApi.list(params),
        members.length === 0 ? membersApi.list() : Promise.resolve({ data: members }),
      ]);
      setInvoices(i.data);
      if (members.length === 0) setMembers(m.data);
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
  }, [year]);

  const filtered = useMemo(() => {
    if (!memberSearch.trim()) return invoices;
    const q = memberSearch.toLowerCase();
    return invoices.filter((inv) =>
      (inv.recipient_name || "").toLowerCase().includes(q) ||
      (inv.recipient_fiscal_code || "").toLowerCase().includes(q)
    );
  }, [invoices, memberSearch]);

  const totale = useMemo(
    () => filtered.reduce((sum, i) => sum + Number(i.amount || 0), 0),
    [filtered]
  );

  const download = async (inv) => {
    try {
      const res = await invoicesApi.downloadPdf(inv.id);
      downloadBlob(res, `fattura_${inv.number || inv.id}.pdf`);
    } catch (e) {
      alert(e.response?.data?.detail || "Errore download");
    }
  };

  const remove = async (inv) => {
    if (!window.confirm(`Eliminare la fattura ${inv.number}?`)) return;
    try {
      await invoicesApi.remove(inv.id);
      setMsg("Fattura eliminata");
      setTimeout(() => setMsg(""), 1500);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || "Errore");
    }
  };

  return (
    <div style={S.container}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 20,
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={S.title}>Fatture</h1>
          <div style={S.subtitle}>
            {filtered.length} fatture • totale {formatEuro(totale)}
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          style={{ ...S.btn, ...S.btnGold, color: colors.deep }}
        >
          + Nuova fattura
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          ...S.card,
          display: "grid",
          gridTemplateColumns: "160px 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <label style={S.label}>Anno</label>
          <select
            style={S.input}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={S.label}>Cerca destinatario</label>
          <input
            style={S.input}
            placeholder="Nome o codice fiscale…"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
          />
        </div>
      </div>

      {msg && <Banner kind="ok">{msg}</Banner>}
      {error && <Banner kind="err">{error}</Banner>}

      {loading ? (
        <div style={{ color: colors.muted }}>Caricamento…</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", color: colors.muted }}>
          Nessuna fattura.
        </div>
      ) : (
        <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: colors.panel }}>
                <Th>Numero</Th>
                <Th>Data</Th>
                <Th>Destinatario</Th>
                <Th style={{ textAlign: "right" }}>Importo</Th>
                <Th>Metodo</Th>
                <Th style={{ textAlign: "right" }}>Azioni</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} style={{ borderTop: `1px solid ${colors.borderSoft}` }}>
                  <Td>
                    <strong style={{ color: colors.lagoon }}>{inv.number}</strong>
                  </Td>
                  <Td>{formatDate(inv.date)}</Td>
                  <Td>
                    <div style={{ color: colors.foam, fontWeight: 600 }}>
                      {inv.recipient_name}
                    </div>
                    {inv.recipient_fiscal_code && (
                      <div style={{ color: colors.muted, fontSize: 11 }}>
                        CF: {inv.recipient_fiscal_code}
                      </div>
                    )}
                  </Td>
                  <Td style={{ textAlign: "right", fontWeight: 700, color: colors.foam }}>
                    {formatEuro(inv.amount)}
                  </Td>
                  <Td>
                    <span style={{ color: colors.muted }}>
                      {inv.payment_method || "—"}
                    </span>
                  </Td>
                  <Td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => download(inv)}
                      title="Scarica PDF"
                      style={{
                        ...S.btnSmall,
                        background: colors.lagoon,
                        color: "#fff",
                        marginRight: 4,
                      }}
                    >
                      📄 PDF
                    </button>
                    <button
                      onClick={() => remove(inv)}
                      title="Elimina"
                      style={{ ...S.btnSmall, ...S.btnRed }}
                    >
                      ✕
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <InvoiceFormModal
          members={members}
          year={year}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            setMsg("Fattura creata ✓");
            setTimeout(() => setMsg(""), 2000);
            load();
          }}
        />
      )}
    </div>
  );
}

function Th({ children, style }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "12px 14px",
        color: colors.muted,
        textTransform: "uppercase",
        fontSize: 11,
        letterSpacing: 0.5,
        fontWeight: 600,
        ...style,
      }}
    >
      {children}
    </th>
  );
}
function Td({ children, style }) {
  return (
    <td style={{ padding: "12px 14px", color: colors.foam, ...style }}>{children}</td>
  );
}

function InvoiceFormModal({ members, year, onClose, onSaved }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    member_id: "",
    date: today,
    recipient_name: "",
    recipient_fiscal_code: "",
    recipient_address: "",
    amount: "",
    description: "Quota associativa",
    payment_method: "bonifico",
    fee_id: "",
  });
  const [nextNum, setNextNum] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    invoicesApi
      .nextNumber(year)
      .then(({ data }) => setNextNum(data.number || data.next_number || data))
      .catch(() => setNextNum(null));
  }, [year]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const chooseMember = (id) => {
    const m = members.find((x) => String(x.id) === String(id));
    setForm((f) => ({
      ...f,
      member_id: id,
      recipient_name: m?.name || f.recipient_name,
    }));
  };

  const submit = async () => {
    if (!form.recipient_name.trim() || !form.amount) {
      setErr("Destinatario e importo sono obbligatori");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        member_id: form.member_id ? Number(form.member_id) : null,
        fee_id: form.fee_id ? Number(form.fee_id) : null,
      };
      await invoicesApi.create(payload);
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.detail || "Errore creazione fattura");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Nuova fattura" onClose={onClose} maxWidth={720}>
      {err && <Banner kind="err">{err}</Banner>}
      <div style={{ display: "grid", gap: 12 }}>
        {nextNum && (
          <div
            style={{
              ...S.card,
              padding: 12,
              background: `${colors.lagoon}10`,
              borderColor: `${colors.lagoon}44`,
              fontSize: 13,
            }}
          >
            Prossimo numero fattura: <strong style={{ color: colors.lagoon }}>{nextNum}</strong>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={S.label}>Data *</label>
            <input type="date" style={S.input} value={form.date} onChange={set("date")} />
          </div>
          <div>
            <label style={S.label}>Socio (opzionale)</label>
            <select
              style={S.input}
              value={form.member_id}
              onChange={(e) => chooseMember(e.target.value)}
            >
              <option value="">— destinatario libero —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={S.label}>Ragione sociale / Nome destinatario *</label>
          <input style={S.input} value={form.recipient_name} onChange={set("recipient_name")} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={S.label}>Codice fiscale / P.IVA</label>
            <input
              style={S.input}
              value={form.recipient_fiscal_code}
              onChange={set("recipient_fiscal_code")}
            />
          </div>
          <div>
            <label style={S.label}>Indirizzo</label>
            <input
              style={S.input}
              value={form.recipient_address}
              onChange={set("recipient_address")}
            />
          </div>
        </div>

        <div>
          <label style={S.label}>Descrizione *</label>
          <input style={S.input} value={form.description} onChange={set("description")} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={S.label}>Importo € *</label>
            <input
              type="number"
              step="0.01"
              style={S.input}
              value={form.amount}
              onChange={set("amount")}
            />
          </div>
          <div>
            <label style={S.label}>Metodo pagamento</label>
            <select style={S.input} value={form.payment_method} onChange={set("payment_method")}>
              <option value="bonifico">Bonifico</option>
              <option value="contanti">Contanti</option>
              <option value="pos">POS</option>
              <option value="altro">Altro</option>
            </select>
          </div>
        </div>

        <div>
          <label style={S.label}>ID quota collegata (opzionale)</label>
          <input
            style={S.input}
            value={form.fee_id}
            onChange={set("fee_id")}
            placeholder="es. 42"
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={onClose} style={{ ...S.btn, ...S.btnGhost, flex: 1 }}>
          Annulla
        </button>
        <button onClick={submit} disabled={saving} style={{ ...S.btn, flex: 2 }}>
          {saving ? "Salvataggio…" : "Crea fattura"}
        </button>
      </div>
    </Modal>
  );
}
