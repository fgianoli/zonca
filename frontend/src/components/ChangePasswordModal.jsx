import { useState } from "react";
import Modal from "./Modal";
import { usersApi } from "../api/services";
import { getErrorMessage } from "../api/client";
import { S, colors } from "../styles/theme";

export default function ChangePasswordModal({ onClose }) {
  return (
    <Modal title="Cambia password" onClose={onClose}>
      <ChangePasswordForm onDone={onClose} />
    </Modal>
  );
}

export function ChangePasswordForm({ onDone }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (e) => {
    e?.preventDefault?.();
    setError("");
    setSuccess("");

    if (!currentPassword) {
      setError("Inserisci la password attuale");
      return;
    }
    if (newPassword.length < 6) {
      setError("La nuova password deve avere almeno 6 caratteri");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("La conferma non coincide con la nuova password");
      return;
    }

    setBusy(true);
    try {
      await usersApi.changeOwnPassword(currentPassword, newPassword);
      setSuccess("Password aggiornata ✓");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        if (onDone) onDone();
      }, 1200);
    } catch (e) {
      const status = e.response?.status;
      const detail = e.response?.data?.detail;
      if (status === 401) setError("Password attuale errata");
      else setError(detail || "Errore durante il cambio password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <div>
        <label style={S.label}>Password attuale</label>
        <input
          type="password"
          style={S.input}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div>
        <label style={S.label}>Nuova password (min 6 caratteri)</label>
        <input
          type="password"
          style={S.input}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div>
        <label style={S.label}>Conferma nuova password</label>
        <input
          type="password"
          style={S.input}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      {error && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: `${colors.red}15`,
            color: colors.red,
            border: `1px solid ${colors.red}44`,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: `${colors.green}15`,
            color: colors.green,
            border: `1px solid ${colors.green}44`,
            fontSize: 13,
          }}
        >
          {success}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            style={{ ...S.btn, ...S.btnGhost, flex: 1 }}
          >
            Chiudi
          </button>
        )}
        <button type="submit" disabled={busy} style={{ ...S.btn, flex: 2 }}>
          {busy ? "Salvataggio…" : "Aggiorna password"}
        </button>
      </div>
    </form>
  );
}
