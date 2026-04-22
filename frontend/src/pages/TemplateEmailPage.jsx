import { useEffect, useState, useRef } from "react";
import { emailTemplatesApi } from "../api/services";
import Modal from "../components/Modal";
import { S, colors, fonts, formatDate } from "../styles/theme";

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

export default function TemplateEmailPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await emailTemplatesApi.list();
      setList(data);
      setError("");
    } catch (e) {
      setError(e.response?.data?.detail || "Errore caricamento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const seed = async () => {
    if (!window.confirm("Ripristinare i template email di default? I tuoi testi saranno sovrascritti.")) return;
    try {
      await emailTemplatesApi.seed();
      setMsg("Template di default ripristinati ✓");
      setTimeout(() => setMsg(""), 2000);
      load();
    } catch (e) {
      setError(e.response?.data?.detail || "Errore seed");
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
          <h1 style={S.title}>Template Email</h1>
          <div style={S.subtitle}>{list.length} template • personalizza il testo delle email di sistema</div>
        </div>
        <button onClick={seed} style={{ ...S.btn, ...S.btnGhost }}>
          ↺ Ripristina default
        </button>
      </div>

      {msg && <Banner kind="ok">{msg}</Banner>}
      {error && <Banner kind="err">{error}</Banner>}

      {loading ? (
        <div style={{ color: colors.muted }}>Caricamento…</div>
      ) : list.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", color: colors.muted }}>
          Nessun template. Clicca "Ripristina default" per inizializzare.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {list.map((t) => (
            <div
              key={t.key}
              style={{
                ...S.card,
                display: "flex",
                alignItems: "center",
                gap: 14,
                cursor: "pointer",
              }}
              onClick={() => setEditing(t)}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: `${colors.lagoon}15`,
                  color: colors.lagoon,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                ✉
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: colors.foam, fontWeight: 700, fontSize: 15 }}>
                  {t.name || t.key}
                </div>
                <div style={{ color: colors.muted, fontSize: 12 }}>
                  <span style={{ fontFamily: "monospace" }}>{t.key}</span>
                  {t.subject && ` • ${t.subject}`}
                </div>
              </div>
              {t.updated_at && (
                <div style={{ color: colors.muted, fontSize: 11 }}>
                  Aggiornato {formatDate(t.updated_at)}
                </div>
              )}
              <button
                style={{ ...S.btnSmall, background: colors.lagoon, color: "#fff" }}
              >
                Modifica
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <TemplateEditModal
          tplKey={editing.key}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setMsg("Template salvato ✓");
            setTimeout(() => setMsg(""), 2000);
            load();
          }}
        />
      )}
    </div>
  );
}

function TemplateEditModal({ tplKey, onClose, onSaved }) {
  const [tpl, setTpl] = useState(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    emailTemplatesApi
      .get(tplKey)
      .then(({ data }) => {
        setTpl(data);
        setSubject(data.subject || "");
        setBody(data.body_html || data.body || "");
      })
      .catch((e) => setErr(e.response?.data?.detail || "Errore"))
      .finally(() => setLoading(false));
  }, [tplKey]);

  const insertVar = (name) => {
    const token = `{{${name}}}`;
    const ta = bodyRef.current;
    if (!ta) {
      setBody((b) => b + token);
      return;
    }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  const save = async () => {
    setSaving(true);
    setErr("");
    try {
      await emailTemplatesApi.update(tplKey, { subject, body_html: body });
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.detail || "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const doPreview = async () => {
    setPreviewBusy(true);
    try {
      const { data } = await emailTemplatesApi.preview(tplKey, {});
      setPreview(data);
    } catch (e) {
      setErr(e.response?.data?.detail || "Errore anteprima");
    } finally {
      setPreviewBusy(false);
    }
  };

  return (
    <Modal title={tpl?.name || tplKey} onClose={onClose} maxWidth={900}>
      {loading ? (
        <div style={{ color: colors.muted }}>Caricamento…</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {err && <Banner kind="err">{err}</Banner>}

          <div>
            <label style={S.label}>Chiave template</label>
            <div
              style={{
                ...S.input,
                background: colors.panel,
                fontFamily: "monospace",
                color: colors.muted,
              }}
            >
              {tplKey}
            </div>
          </div>

          <div>
            <label style={S.label}>Oggetto</label>
            <input
              style={S.input}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {tpl?.available_vars && tpl.available_vars.length > 0 && (
            <div>
              <label style={S.label}>
                Variabili disponibili (clicca per inserire)
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {tpl.available_vars.map((v) => (
                  <button
                    key={v}
                    onClick={() => insertVar(v)}
                    style={{
                      ...S.btnSmall,
                      background: `${colors.lagoon}15`,
                      color: colors.lagoon,
                      border: `1px solid ${colors.lagoon}44`,
                      fontFamily: "monospace",
                      fontSize: 11,
                    }}
                  >
                    {"{{"}
                    {v}
                    {"}}"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label style={S.label}>Corpo HTML</label>
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{
                ...S.input,
                minHeight: 320,
                fontFamily: "'SF Mono', Menlo, Consolas, monospace",
                fontSize: 13,
                lineHeight: 1.5,
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={doPreview}
              disabled={previewBusy}
              style={{ ...S.btn, ...S.btnGhost }}
            >
              👁 {previewBusy ? "..." : "Anteprima"}
            </button>
            <button onClick={save} disabled={saving} style={{ ...S.btn, flex: 1 }}>
              {saving ? "Salvataggio…" : "💾 Salva"}
            </button>
          </div>

          {preview && (
            <div
              style={{
                border: `1px solid ${colors.borderSoft}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  background: colors.panel,
                  borderBottom: `1px solid ${colors.borderSoft}`,
                  fontSize: 12,
                  color: colors.muted,
                }}
              >
                <strong style={{ color: colors.foam }}>Oggetto:</strong>{" "}
                {preview.subject}
              </div>
              <iframe
                title="preview"
                srcDoc={preview.body_html || preview.body || ""}
                style={{
                  width: "100%",
                  minHeight: 300,
                  border: "none",
                  background: "#fff",
                }}
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
