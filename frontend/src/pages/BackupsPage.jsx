import { useEffect, useState } from "react";
import { backupsApi, downloadBlob } from "../api/services";
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

const formatBytes = (bytes) => {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = Number(bytes);
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
};

const formatDateTime = (s) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return formatDate(s);
  }
};

export default function BackupsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await backupsApi.list();
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

  const runNow = async () => {
    setRunning(true);
    setMsg("");
    setError("");
    try {
      await backupsApi.runNow();
      setMsg("Backup avviato ✓");
      setTimeout(() => setMsg(""), 2000);
      load();
    } catch (e) {
      setError(e.response?.data?.detail || "Errore esecuzione");
    } finally {
      setRunning(false);
    }
  };

  const download = async (f) => {
    try {
      const res = await backupsApi.download(f.filename);
      downloadBlob(res, f.filename);
    } catch (e) {
      setError(e.response?.data?.detail || "Errore download");
    }
  };

  const remove = async (f) => {
    if (!window.confirm(`Eliminare il backup "${f.filename}"?`)) return;
    try {
      await backupsApi.remove(f.filename);
      setMsg("Backup eliminato");
      setTimeout(() => setMsg(""), 1500);
      load();
    } catch (e) {
      setError(e.response?.data?.detail || "Errore eliminazione");
    }
  };

  const totaleBytes = list.reduce((s, b) => s + (Number(b.size) || 0), 0);

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
          <h1 style={S.title}>
            <span style={{ color: colors.lagoon }}>💾</span> Backup
          </h1>
          <div style={S.subtitle}>
            {list.length} backup • {formatBytes(totaleBytes)} totali
          </div>
        </div>
        <button
          onClick={runNow}
          disabled={running}
          style={{ ...S.btn, ...S.btnGold, color: colors.deep }}
        >
          {running ? "Esecuzione…" : "▶ Esegui backup ora"}
        </button>
      </div>

      <div
        style={{
          ...S.card,
          background: `${colors.lagoon}10`,
          borderColor: `${colors.lagoon}44`,
          marginBottom: 16,
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: colors.lagoon }}>ℹ Info</strong> — I backup automatici
        vengono eseguiti ogni notte alle <strong>03:00 UTC</strong>. La retention è di{" "}
        <strong>30 giorni</strong>: i backup più vecchi vengono rimossi automaticamente.
      </div>

      {msg && <Banner kind="ok">{msg}</Banner>}
      {error && <Banner kind="err">{error}</Banner>}

      {loading ? (
        <div style={{ color: colors.muted }}>Caricamento…</div>
      ) : list.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", color: colors.muted }}>
          Nessun backup presente.
        </div>
      ) : (
        <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: colors.panel }}>
                <th style={thStyle}>File</th>
                <th style={thStyle}>Data</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Dimensione</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {list.map((b) => (
                <tr
                  key={b.filename}
                  style={{ borderTop: `1px solid ${colors.borderSoft}` }}
                >
                  <td style={tdStyle}>
                    <span style={{ fontFamily: "monospace", color: colors.foam }}>
                      {b.filename}
                    </span>
                  </td>
                  <td style={tdStyle}>{formatDateTime(b.created_at || b.modified_at)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {formatBytes(b.size)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => download(b)}
                      style={{
                        ...S.btnSmall,
                        background: colors.lagoon,
                        color: "#fff",
                        marginRight: 4,
                      }}
                    >
                      ⬇ Scarica
                    </button>
                    <button
                      onClick={() => remove(b)}
                      style={{ ...S.btnSmall, ...S.btnRed }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "12px 14px",
  color: colors.muted,
  textTransform: "uppercase",
  fontSize: 11,
  letterSpacing: 0.5,
  fontWeight: 600,
};
const tdStyle = { padding: "12px 14px", color: colors.foam };
