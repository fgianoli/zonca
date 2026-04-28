import { useEffect, useState } from "react";
import { gdprApi } from "../api/services";
import { getErrorMessage } from "../api/client";
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

export default function GdprRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [processing, setProcessing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await gdprApi.listRequests();
      setRequests(data);
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

  const process = async (req) => {
    if (
      !window.confirm(
        `Processare la cancellazione di ${req.email}? Questa operazione è IRREVERSIBILE.`
      )
    )
      return;
    setProcessing(req.id);
    try {
      await gdprApi.processRequest(req.id);
      setMsg("Cancellazione processata ✓");
      setTimeout(() => setMsg(""), 2000);
      load();
    } catch (e) {
      setError(getErrorMessage(e, "Errore"));
    } finally {
      setProcessing(null);
    }
  };

  const pending = requests.filter((r) => r.status === "pending");
  const processed = requests.filter((r) => r.status !== "pending");

  return (
    <div style={S.container}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={S.title}>
          <span style={{ color: colors.lagoon }}>🛡</span> Richieste GDPR
        </h1>
        <div style={S.subtitle}>
          Gestione richieste di cancellazione dati ai sensi del GDPR
        </div>
      </div>

      {msg && <Banner kind="ok">{msg}</Banner>}
      {error && <Banner kind="err">{error}</Banner>}

      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontFamily: fonts.display,
            fontSize: 18,
            color: colors.gold,
            marginBottom: 12,
          }}
        >
          In attesa ({pending.length})
        </h2>
        {loading ? (
          <div style={{ color: colors.muted }}>Caricamento…</div>
        ) : pending.length === 0 ? (
          <div style={{ ...S.card, textAlign: "center", color: colors.muted }}>
            Nessuna richiesta pendente.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {pending.map((r) => (
              <div
                key={r.id}
                style={{
                  ...S.card,
                  borderLeft: `4px solid ${colors.gold}`,
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div
                    style={{
                      color: colors.foam,
                      fontWeight: 700,
                      fontSize: 15,
                      marginBottom: 4,
                    }}
                  >
                    ✉ {r.email}
                  </div>
                  <div style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
                    Ricevuta il {formatDate(r.created_at)}
                  </div>
                  {r.reason && (
                    <div
                      style={{
                        background: colors.panel,
                        padding: 10,
                        borderRadius: 8,
                        fontSize: 13,
                        color: colors.foam,
                        fontStyle: "italic",
                      }}
                    >
                      "{r.reason}"
                    </div>
                  )}
                </div>
                <button
                  onClick={() => process(r)}
                  disabled={processing === r.id}
                  style={{ ...S.btn, ...S.btnRed }}
                >
                  {processing === r.id ? "Processando…" : "🗑 Processa cancellazione"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2
          style={{
            fontFamily: fonts.display,
            fontSize: 18,
            color: colors.muted,
            marginBottom: 12,
          }}
        >
          Storico ({processed.length})
        </h2>
        {processed.length === 0 ? (
          <div style={{ color: colors.muted, fontSize: 13, fontStyle: "italic" }}>
            Nessuna richiesta processata.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {processed.map((r) => (
              <div
                key={r.id}
                style={{
                  ...S.card,
                  padding: 12,
                  opacity: 0.7,
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    ...S.badge,
                    background: `${colors.green}22`,
                    color: colors.green,
                  }}
                >
                  ✓ {r.status}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: colors.foam, fontWeight: 600, fontSize: 13 }}>
                    {r.email}
                  </div>
                  <div style={{ color: colors.muted, fontSize: 11 }}>
                    Richiesta {formatDate(r.created_at)}
                    {r.processed_at && ` • processata ${formatDate(r.processed_at)}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
