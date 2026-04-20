import { useEffect, useState } from "react";
import { settingsApi } from "../api/services";
import { S, colors, fonts } from "../styles/theme";

const emptySmtp = {
  smtp_host: "",
  smtp_port: 465,
  smtp_user: "",
  smtp_password: "",
  smtp_from: "",
  reminder_days_before: 30,
};

const HELP = {
  smtp_host: "Server SMTP (es. OVH: ssl0.ovh.net)",
  smtp_port: "Porta (465 per SSL, 587 per TLS)",
  smtp_user: "Utente per l'autenticazione SMTP",
  smtp_password: "Password del servizio email",
  smtp_from: "Indirizzo mittente mostrato nei messaggi",
  reminder_days_before: "Giorni di preavviso per promemoria scadenza certificati",
};

export default function ImpostazioniPage() {
  const [form, setForm] = useState(emptySmtp);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok'|'err', text }

  const load = async () => {
    setLoading(true);
    try {
      const r = await settingsApi.getSmtp();
      setForm({ ...emptySmtp, ...(r.data || {}) });
    } catch {
      setMessage({ type: "err", text: "Errore nel caricamento delle impostazioni" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (k) => (e) => {
    const v = e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await settingsApi.updateSmtp(form);
      setMessage({ type: "ok", text: "Impostazioni salvate correttamente." });
    } catch {
      setMessage({ type: "err", text: "Errore nel salvataggio." });
    } finally {
      setSaving(false);
    }
  };

  const seed = async () => {
    if (!window.confirm("Popolare i valori di default? Sovrascriverà i campi non configurati.")) return;
    setSeeding(true);
    setMessage(null);
    try {
      await settingsApi.seedSmtp();
      await load();
      setMessage({ type: "ok", text: "Valori di default popolati." });
    } catch {
      setMessage({ type: "err", text: "Errore nel popolamento dei default." });
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div style={S.container}>
        <p style={{ color: colors.muted }}>Caricamento...</p>
      </div>
    );
  }

  const field = (key, label, type = "text") => (
    <div style={{ marginBottom: 16 }}>
      <label style={S.label}>{label}</label>
      <input
        style={S.input}
        type={type}
        value={form[key] ?? ""}
        onChange={set(key)}
      />
      <div style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{HELP[key]}</div>
    </div>
  );

  return (
    <div style={S.container}>
      <h1 style={S.title}>Impostazioni</h1>
      <p style={S.subtitle}>Configurazione del sistema</p>

      {message && (
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            backgroundColor: (message.type === "ok" ? colors.green : colors.red) + "22",
            border: `1px solid ${message.type === "ok" ? colors.green : colors.red}`,
            borderRadius: 8,
            color: message.type === "ok" ? colors.green : colors.red,
          }}
        >
          {message.text}
        </div>
      )}

      <div style={{ ...S.card, marginTop: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            paddingBottom: 12,
            borderBottom: `1px solid ${colors.lagoon}33`,
          }}
        >
          <h2 style={{ fontFamily: fonts.display, color: colors.gold, fontSize: 22, margin: 0 }}>
            Configurazione Email
          </h2>
          <button
            type="button"
            style={{ ...S.btn, ...S.btnGhost, opacity: seeding ? 0.5 : 1 }}
            onClick={seed}
            disabled={seeding}
          >
            {seeding ? "..." : "Popola valori default"}
          </button>
        </div>

        <form onSubmit={save}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: 220 }}>{field("smtp_host", "SMTP Host")}</div>
            <div style={{ flex: 1, minWidth: 100 }}>{field("smtp_port", "Porta", "number")}</div>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>{field("smtp_user", "Utente SMTP")}</div>
            <div style={{ flex: 1, minWidth: 220 }}>{field("smtp_password", "Password SMTP", "password")}</div>
          </div>

          {field("smtp_from", "Mittente (From)")}

          <div style={{ maxWidth: 280 }}>
            {field("reminder_days_before", "Giorni preavviso scadenza", "number")}
          </div>

          <div
            style={{
              marginTop: 24,
              padding: 16,
              backgroundColor: colors.water,
              border: `1px solid ${colors.lagoon}33`,
              borderRadius: 8,
              color: colors.muted,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: colors.foam }}>Come funzionano i promemoria</strong>
            <br />
            Il sistema invia automaticamente un'email ai soci il cui certificato medico sta per scadere
            entro i giorni configurati sopra. I promemoria partono una volta alla settimana e usano i
            parametri SMTP definiti in questa pagina. Assicurati che l'indirizzo mittente sia autorizzato
            sul server SMTP scelto.
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
            <button
              type="submit"
              style={{ ...S.btn, ...S.btnGold, opacity: saving ? 0.5 : 1 }}
              disabled={saving}
            >
              {saving ? "Salvataggio..." : "Salva impostazioni"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
