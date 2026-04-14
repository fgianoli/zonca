import { useState } from "react";
import api from "../api/client";
import { colors, fonts } from "../styles/theme";

const S = {
  section: {
    maxWidth: 600,
    margin: "0 auto",
    padding: "40px 20px",
  },
  title: {
    fontFamily: fonts.display,
    color: colors.gold,
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 32,
  },
  label: {
    display: "block",
    color: colors.muted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: fonts.body,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    backgroundColor: colors.deep,
    border: `1px solid ${colors.lagoon}44`,
    borderRadius: 6,
    color: colors.foam,
    fontSize: 14,
    fontFamily: fonts.body,
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "10px 14px",
    backgroundColor: colors.deep,
    border: `1px solid ${colors.lagoon}44`,
    borderRadius: 6,
    color: colors.foam,
    fontSize: 14,
    fontFamily: fonts.body,
    outline: "none",
    boxSizing: "border-box",
    minHeight: 120,
    resize: "vertical",
  },
  field: {
    marginBottom: 20,
  },
  btn: {
    padding: "12px 32px",
    backgroundColor: colors.lagoon,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: fonts.body,
    cursor: "pointer",
    transition: "opacity .2s",
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  success: {
    padding: "16px 20px",
    backgroundColor: colors.green + "22",
    border: `1px solid ${colors.green}`,
    borderRadius: 8,
    color: colors.green,
    textAlign: "center",
    marginTop: 20,
  },
  error: {
    padding: "16px 20px",
    backgroundColor: colors.red + "22",
    border: `1px solid ${colors.red}`,
    borderRadius: 8,
    color: colors.red,
    textAlign: "center",
    marginTop: 20,
  },
};

const initial = { name: "", email: "", subject: "", message: "" };

export default function ContactForm() {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState(null); // null | "sending" | "ok" | "error"

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const valid =
    form.name.trim() &&
    form.email.trim() &&
    form.subject.trim() &&
    form.message.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setStatus("sending");
    try {
      await api.post("/api/contact/", form);
      setStatus("ok");
      setForm(initial);
    } catch {
      setStatus("error");
    }
  };

  return (
    <section style={S.section}>
      <h2 style={S.title}>Contattaci</h2>
      <p style={S.subtitle}>
        Hai domande sulla scuola di voga o vuoi prenotare una lezione? Scrivici!
      </p>

      <form onSubmit={submit}>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ ...S.field, flex: 1 }}>
            <label style={S.label}>Nome</label>
            <input
              style={S.input}
              value={form.name}
              onChange={set("name")}
              placeholder="Il tuo nome"
            />
          </div>
          <div style={{ ...S.field, flex: 1 }}>
            <label style={S.label}>Email</label>
            <input
              style={S.input}
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="email@esempio.it"
            />
          </div>
        </div>

        <div style={S.field}>
          <label style={S.label}>Oggetto</label>
          <input
            style={S.input}
            value={form.subject}
            onChange={set("subject")}
            placeholder="Di cosa vuoi parlarci?"
          />
        </div>

        <div style={S.field}>
          <label style={S.label}>Messaggio</label>
          <textarea
            style={S.textarea}
            value={form.message}
            onChange={set("message")}
            placeholder="Scrivi il tuo messaggio..."
          />
        </div>

        <button
          type="submit"
          style={{
            ...S.btn,
            ...(status === "sending" || !valid ? S.btnDisabled : {}),
          }}
          disabled={status === "sending" || !valid}
        >
          {status === "sending" ? "Invio in corso..." : "Invia messaggio"}
        </button>
      </form>

      {status === "ok" && (
        <div style={S.success}>
          Messaggio inviato! Ti risponderemo al più presto.
        </div>
      )}
      {status === "error" && (
        <div style={S.error}>
          Errore nell'invio. Riprova o scrivi direttamente a scuolazonca@gmail.com
        </div>
      )}
    </section>
  );
}
