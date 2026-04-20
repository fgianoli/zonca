import { useEffect, useState } from "react";
import { circularsApi } from "../api/services";
import { S, colors, fonts, formatDate, RUOLI } from "../styles/theme";
import Modal from "../components/Modal";

const TARGETS = [
  { value: "", label: "Tutti i soci" },
  { value: "pope", label: "Solo Pope" },
  { value: "paron", label: "Solo Paron" },
  { value: "provin", label: "Solo Provin" },
  { value: "ospite", label: "Solo Ospiti" },
];

const emptyForm = { subject: "", target_ruolo: "", body: "" };

// Convert plain text to HTML: split on \n\n -> paragraphs, single \n -> <br>
function textToHtml(text) {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

export default function CircolariPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await circularsApi.list();
      const data = r.data || [];
      const sorted = [...data].sort((a, b) =>
        (b.sent_at || "").localeCompare(a.sent_at || "")
      );
      setList(sorted);
      if (sorted.length && !selected) setSelected(sorted[0]);
      setError(null);
    } catch {
      setError("Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.body.trim()) return;
    setSending(true);
    setFeedback(null);
    try {
      const payload = {
        subject: form.subject.trim(),
        body_html: textToHtml(form.body.trim()),
        target_ruolo: form.target_ruolo || null,
      };
      const r = await circularsApi.create(payload);
      const created = r.data;
      setFeedback(
        `Circolare inviata a ${created.sent_count ?? "?"} soci.`
      );
      setForm(emptyForm);
      setModalOpen(false);
      await load();
      if (created) setSelected(created);
    } catch {
      setFeedback("Errore nell'invio della circolare.");
    } finally {
      setSending(false);
    }
  };

  const targetLabel = (t) => {
    if (!t) return "Tutti";
    return RUOLI[t]?.label || t;
  };

  return (
    <div style={S.container}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={S.title}>Circolari</h1>
          <p style={S.subtitle}>Invia e archivia comunicazioni ai soci</p>
        </div>
        <button style={{ ...S.btn, ...S.btnGold }} onClick={() => setModalOpen(true)}>
          + Nuova circolare
        </button>
      </div>

      {feedback && (
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            backgroundColor: colors.green + "22",
            border: `1px solid ${colors.green}`,
            borderRadius: 8,
            color: colors.green,
          }}
        >
          {feedback}
        </div>
      )}

      <div style={{ display: "flex", gap: 20, marginTop: 24, flexWrap: "wrap" }}>
        {/* Sidebar list */}
        <div style={{ ...S.card, flex: "0 0 320px", maxHeight: 600, overflowY: "auto" }}>
          <h3 style={{ fontFamily: fonts.display, color: colors.gold, fontSize: 16, margin: "0 0 12px" }}>
            Archivio
          </h3>
          {loading ? (
            <p style={{ color: colors.muted }}>Caricamento...</p>
          ) : error ? (
            <p style={{ color: colors.red }}>{error}</p>
          ) : list.length === 0 ? (
            <p style={{ color: colors.muted }}>Nessuna circolare inviata.</p>
          ) : (
            list.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                style={{
                  padding: 12,
                  marginBottom: 8,
                  borderRadius: 6,
                  cursor: "pointer",
                  backgroundColor: selected?.id === c.id ? colors.lagoon + "33" : colors.water,
                  borderLeft: `3px solid ${selected?.id === c.id ? colors.gold : "transparent"}`,
                }}
              >
                <div style={{ color: colors.foam, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                  {c.subject}
                </div>
                <div style={{ color: colors.muted, fontSize: 11 }}>
                  {formatDate(c.sent_at)} · {targetLabel(c.target_ruolo)} · {c.sent_count ?? 0} destinatari
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail */}
        <div style={{ ...S.card, flex: 1, minWidth: 320 }}>
          {!selected ? (
            <p style={{ color: colors.muted }}>Seleziona una circolare per visualizzarla.</p>
          ) : (
            <>
              <h2 style={{ fontFamily: fonts.display, color: colors.gold, fontSize: 22, margin: "0 0 8px" }}>
                {selected.subject}
              </h2>
              <div style={{ color: colors.muted, fontSize: 12, marginBottom: 20 }}>
                Inviata il {formatDate(selected.sent_at)} · Destinatari: {targetLabel(selected.target_ruolo)} ·{" "}
                {selected.sent_count ?? 0} soci
              </div>
              <div
                style={{
                  color: colors.foam,
                  lineHeight: 1.6,
                  fontSize: 14,
                  padding: "16px 0",
                  borderTop: `1px solid ${colors.lagoon}33`,
                }}
                dangerouslySetInnerHTML={{ __html: selected.body_html || "" }}
              />
            </>
          )}
        </div>
      </div>

      {modalOpen && (
        <Modal title="Nuova circolare" onClose={() => setModalOpen(false)} maxWidth={700}>
          <form onSubmit={submit}>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Oggetto</label>
              <input style={S.input} value={form.subject} onChange={set("subject")} required />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Destinatari</label>
              <select style={S.input} value={form.target_ruolo} onChange={set("target_ruolo")}>
                {TARGETS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Testo</label>
              <textarea
                style={{ ...S.input, minHeight: 220, resize: "vertical", fontFamily: fonts.body }}
                value={form.body}
                onChange={set("body")}
                required
              />
              <div style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
                Puoi usare HTML base (&lt;strong&gt;, &lt;em&gt;, &lt;br&gt;, &lt;a&gt;). Le righe vuote creano nuovi paragrafi.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
              <button type="button" style={{ ...S.btn, ...S.btnGhost }} onClick={() => setModalOpen(false)}>
                Annulla
              </button>
              <button
                type="submit"
                style={{ ...S.btn, ...S.btnGold, opacity: sending ? 0.5 : 1 }}
                disabled={sending}
              >
                {sending ? "Invio in corso..." : "Invia circolare"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
